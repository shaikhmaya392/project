<?php
/**
 * DS Permitting - CRM Lead Forwarder
 *
 * Install: WordPress Admin -> Code Snippets (WPCode) -> Add New
 *   - Code Type: PHP Snippet
 *   - Insertion: Run Everywhere (Auto Insert)
 *   - Paste this entire file, then Activate.
 *
 * Every time a Formidable Forms entry is submitted on the site, this pushes
 * a normalized copy of it straight to the CRM's webhook endpoint. Historical
 * entries do not need this snippet - those were imported separately.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('DSCRM_WEBHOOK_URL', 'https://project-git-claude-modest-wozniak-3wa2f6-shaheer-9f09.vercel.app/api/leads/webhook');
define('DSCRM_API_KEY', 'REPLACE_WITH_GENERATED_API_KEY');

add_action('frm_after_create_entry', function ($item_id) {
    global $wpdb;

    $item = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}frm_items WHERE id = %d",
        $item_id
    ));
    if (!$item) {
        return;
    }

    $form = $wpdb->get_row($wpdb->prepare(
        "SELECT name FROM {$wpdb->prefix}frm_forms WHERE id = %d",
        $item->form_id
    ));

    $metas = $wpdb->get_results($wpdb->prepare(
        "SELECT m.meta_value, f.name AS field_label
         FROM {$wpdb->prefix}frm_item_metas m
         JOIN {$wpdb->prefix}frm_fields f ON f.id = m.field_id
         WHERE m.item_id = %d",
        $item_id
    ));

    $data = array('name' => '', 'email' => '', 'phone' => '', 'address' => '', 'service_type' => '');
    $message_parts = array();
    $raw = array();

    foreach ($metas as $meta) {
        $label = (string) $meta->field_label;
        $value = is_array($meta->meta_value) ? implode(', ', (array) $meta->meta_value) : (string) $meta->meta_value;

        // Keep every field even when two fields share the same label
        // (e.g. multiple "Email" fields on a form).
        $rawKey = $label;
        $dupeIndex = 2;
        while (array_key_exists($rawKey, $raw)) {
            $rawKey = $label . ' (' . $dupeIndex . ')';
            $dupeIndex++;
        }
        $raw[$rawKey] = $value;

        $lower = strtolower($label);

        if ($data['name'] === '' && (strpos($lower, 'name') !== false)) {
            $data['name'] = $value;
        } elseif ($data['email'] === '' && strpos($lower, 'email') !== false) {
            $data['email'] = $value;
        } elseif ($data['phone'] === '' && strpos($lower, 'phone') !== false) {
            $data['phone'] = $value;
        } elseif ($data['address'] === '' && strpos($lower, 'located') !== false) {
            $data['address'] = $value;
        } elseif ($data['service_type'] === '' && (strpos($lower, 'help') !== false || strpos($lower, 'service') !== false || strpos($lower, 'subject') !== false)) {
            $data['service_type'] = $value;
        } else {
            $message_parts[] = $label . ': ' . $value;
        }
    }

    $payload = array(
        'frm_item_id' => (int) $item_id,
        'name' => $data['name'],
        'email' => $data['email'],
        'phone' => $data['phone'],
        'address' => $data['address'],
        'service_type' => $data['service_type'],
        'message' => implode("\n", $message_parts),
        'form_name' => $form ? $form->name : '',
        'raw_data' => $raw,
        'created_at' => $item->created_at,
    );

    wp_remote_post(DSCRM_WEBHOOK_URL, array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-api-key' => DSCRM_API_KEY,
        ),
        'body' => wp_json_encode($payload),
        'timeout' => 10,
        'blocking' => false,
    ));
}, 30, 1);

/**
 * Lets the CRM send proposal/notification emails through this site's
 * already-configured WP Mail SMTP setup, instead of needing a separate
 * email provider.
 */
add_action('rest_api_init', function () {
    register_rest_route('dscrm/v1', '/send-email', array(
        'methods' => 'POST',
        'callback' => 'dscrm_send_email',
        'permission_callback' => function ($request) {
            $key = $request->get_header('x-api-key');
            return is_string($key) && hash_equals(DSCRM_API_KEY, $key);
        },
    ));
});

function dscrm_send_email($request) {
    $body = json_decode($request->get_body(), true) ?: array();
    $to = isset($body['to']) ? sanitize_email($body['to']) : '';
    $subject = isset($body['subject']) ? sanitize_text_field($body['subject']) : '';
    $html = isset($body['html']) ? wp_kses_post($body['html']) : '';

    if (!is_email($to) || !$subject || !$html) {
        return new WP_Error('bad_request', 'to, subject and html are required', array('status' => 400));
    }

    $attachments = array();
    $tmpFile = null;
    if (!empty($body['attachment_base64']) && !empty($body['attachment_filename'])) {
        $decoded = base64_decode($body['attachment_base64'], true);
        if ($decoded !== false) {
            $filename = sanitize_file_name($body['attachment_filename']);
            $tmpFile = trailingslashit(get_temp_dir()) . 'dscrm-' . wp_generate_password(8, false) . '-' . $filename;
            file_put_contents($tmpFile, $decoded);
            $attachments[] = $tmpFile;
        }
    }

    add_filter('wp_mail_content_type', function () {
        return 'text/html';
    });
    $sent = wp_mail($to, $subject, $html, array(), $attachments);
    remove_filter('wp_mail_content_type', 'wp_mail_content_type');

    if ($tmpFile && file_exists($tmpFile)) {
        unlink($tmpFile);
    }

    return rest_ensure_response(array('sent' => (bool) $sent));
}
