<?php
/**
 * DS Permitting - CRM Leads Bridge
 *
 * Install: WordPress Admin -> Code Snippets (WPCode) -> Add New
 *   - Code Type: PHP Snippet
 *   - Insertion: Run Everywhere (Auto Insert)
 *   - Paste this entire file, then Activate.
 *
 * Creates a `wp_ds_crm_leads` table, auto-captures every Formidable Forms
 * submission into it, and exposes a REST API (protected by an API key)
 * that the Next.js CRM app reads/writes through.
 */

if (!defined('ABSPATH')) {
    exit;
}

// Replace this with the key given to you alongside this file, and use the
// exact same value for the WORDPRESS_API_KEY env var on the Vercel project.
define('DSCRM_API_KEY', 'REPLACE_WITH_GENERATED_API_KEY');

function dscrm_table() {
    global $wpdb;
    return $wpdb->prefix . 'ds_crm_leads';
}

add_action('init', function () {
    global $wpdb;
    $table = dscrm_table();
    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table) {
        return;
    }
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset_collate = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE {$table} (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        frm_item_id BIGINT UNSIGNED DEFAULT NULL,
        name VARCHAR(255) DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        phone VARCHAR(100) DEFAULT '',
        address TEXT,
        service_type VARCHAR(255) DEFAULT '',
        message TEXT,
        source VARCHAR(50) DEFAULT 'manual',
        form_name VARCHAR(255) DEFAULT '',
        status VARCHAR(50) DEFAULT 'new',
        assigned_to VARCHAR(255) DEFAULT '',
        notes TEXT,
        raw_data LONGTEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY frm_item_id (frm_item_id)
    ) {$charset_collate};";
    dbDelta($sql);
});

/**
 * Build a normalized lead record from a Formidable Forms entry id using the
 * raw tables directly, so it works regardless of Formidable version/API.
 */
function dscrm_build_lead_from_entry($item_id) {
    global $wpdb;

    $item = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}frm_items WHERE id = %d",
        $item_id
    ));
    if (!$item) {
        return null;
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

        if ($data['name'] === '' && strpos($lower, 'name') !== false) {
            $data['name'] = $value;
        } elseif ($data['email'] === '' && strpos($lower, 'email') !== false) {
            $data['email'] = $value;
        } elseif ($data['phone'] === '' && (strpos($lower, 'phone') !== false || strpos($lower, 'contact') !== false)) {
            $data['phone'] = $value;
        } elseif ($data['address'] === '' && strpos($lower, 'address') !== false) {
            $data['address'] = $value;
        } elseif ($data['service_type'] === '' && (strpos($lower, 'service') !== false || strpos($lower, 'permit') !== false)) {
            $data['service_type'] = $value;
        } else {
            $message_parts[] = $label . ': ' . $value;
        }
    }

    return array(
        'frm_item_id' => $item_id,
        'name' => $data['name'],
        'email' => $data['email'],
        'phone' => $data['phone'],
        'address' => $data['address'],
        'service_type' => $data['service_type'],
        'message' => implode("\n", $message_parts),
        'source' => 'website_form',
        'form_name' => $form ? $form->name : '',
        'status' => 'new',
        'raw_data' => wp_json_encode($raw),
        'created_at' => $item->created_at,
        'updated_at' => current_time('mysql'),
    );
}

function dscrm_upsert_entry($item_id) {
    global $wpdb;
    $lead = dscrm_build_lead_from_entry($item_id);
    if (!$lead) {
        return;
    }
    $existing = $wpdb->get_var($wpdb->prepare(
        'SELECT id FROM ' . dscrm_table() . ' WHERE frm_item_id = %d',
        $item_id
    ));
    if ($existing) {
        return;
    }
    $wpdb->insert(dscrm_table(), $lead);
}

// Capture new submissions in real time.
add_action('frm_after_create_entry', function ($entry_id) {
    dscrm_upsert_entry($entry_id);
}, 30, 1);

add_action('rest_api_init', function () {
    register_rest_route('dscrm/v1', '/leads', array(
        array('methods' => 'GET', 'callback' => 'dscrm_get_leads', 'permission_callback' => 'dscrm_auth'),
        array('methods' => 'POST', 'callback' => 'dscrm_create_lead', 'permission_callback' => 'dscrm_auth'),
    ));
    register_rest_route('dscrm/v1', '/leads/(?P<id>\d+)', array(
        array('methods' => 'GET', 'callback' => 'dscrm_get_lead', 'permission_callback' => 'dscrm_auth'),
        array('methods' => array('PATCH', 'POST'), 'callback' => 'dscrm_update_lead', 'permission_callback' => 'dscrm_auth'),
        array('methods' => 'DELETE', 'callback' => 'dscrm_delete_lead', 'permission_callback' => 'dscrm_auth'),
    ));
    register_rest_route('dscrm/v1', '/backfill', array(
        'methods' => 'POST',
        'callback' => 'dscrm_backfill',
        'permission_callback' => 'dscrm_auth',
    ));
});

function dscrm_auth($request) {
    $key = $request->get_header('x-api-key');
    return is_string($key) && hash_equals(DSCRM_API_KEY, $key);
}

function dscrm_get_leads() {
    global $wpdb;
    $rows = $wpdb->get_results('SELECT * FROM ' . dscrm_table() . ' ORDER BY created_at DESC', ARRAY_A);
    return rest_ensure_response($rows);
}

function dscrm_get_lead($request) {
    global $wpdb;
    $row = $wpdb->get_row($wpdb->prepare(
        'SELECT * FROM ' . dscrm_table() . ' WHERE id = %d',
        (int) $request['id']
    ), ARRAY_A);
    if (!$row) {
        return new WP_Error('not_found', 'Lead not found', array('status' => 404));
    }
    return rest_ensure_response($row);
}

function dscrm_create_lead($request) {
    global $wpdb;
    $body = json_decode($request->get_body(), true) ?: array();
    $allowed = array('name', 'email', 'phone', 'address', 'service_type', 'message', 'status', 'assigned_to', 'notes');
    $data = array('source' => 'manual', 'created_at' => current_time('mysql'), 'updated_at' => current_time('mysql'));
    foreach ($allowed as $field) {
        $data[$field] = isset($body[$field]) ? sanitize_textarea_field($body[$field]) : '';
    }
    if ($data['status'] === '') {
        $data['status'] = 'new';
    }
    $wpdb->insert(dscrm_table(), $data);
    $id = $wpdb->insert_id;
    return dscrm_get_lead(new WP_REST_Request('GET', '', array('id' => $id)));
}

function dscrm_update_lead($request) {
    global $wpdb;
    $id = (int) $request['id'];
    $body = json_decode($request->get_body(), true) ?: array();
    $allowed = array('name', 'email', 'phone', 'address', 'service_type', 'message', 'status', 'assigned_to', 'notes');
    $data = array('updated_at' => current_time('mysql'));
    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $data[$field] = sanitize_textarea_field($body[$field]);
        }
    }
    $wpdb->update(dscrm_table(), $data, array('id' => $id));
    return dscrm_get_lead($request);
}

function dscrm_delete_lead($request) {
    global $wpdb;
    $wpdb->delete(dscrm_table(), array('id' => (int) $request['id']));
    return rest_ensure_response(array('deleted' => true));
}

// One-time (safe to re-run) import of every historical Formidable entry.
function dscrm_backfill() {
    global $wpdb;
    $ids = $wpdb->get_col("SELECT id FROM {$wpdb->prefix}frm_items");
    $imported = 0;
    foreach ($ids as $item_id) {
        $before = $wpdb->get_var($wpdb->prepare(
            'SELECT id FROM ' . dscrm_table() . ' WHERE frm_item_id = %d',
            $item_id
        ));
        if (!$before) {
            dscrm_upsert_entry((int) $item_id);
            $imported++;
        }
    }
    return rest_ensure_response(array('scanned' => count($ids), 'imported' => $imported));
}
