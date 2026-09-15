<?php
/**
 * DS Permitting - CRM Lead Forwarder
 *
 * Install: WordPress Admin -> Code Snippets (WPCode) -> Add New
 *   - Code Type: PHP Snippet
 *   - Insertion: Run Everywhere (Auto Insert)
 *   - Paste this entire file, replace the two constants below, then Activate.
 *
 * Every time a Formidable Forms entry is submitted on the site, this pushes
 * a normalized copy of it straight to the CRM's webhook endpoint. Historical
 * entries do not need this snippet - those were imported separately.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('DSCRM_WEBHOOK_URL', 'https://REPLACE_WITH_YOUR_CRM_DOMAIN/api/leads/webhook');
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
        $raw[$label] = $value;
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
