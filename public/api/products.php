<?php
/**
 * API - PRODUTOS / CARDÁPIO & FICHAS TÉCNICAS
 * HostGator Plano M MySQL
 */
require_once __DIR__ . '/config.php';

$pdo = getDatabaseConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM products ORDER BY category ASC, name ASC");
    $rows = $stmt->fetchAll();

    $products = array_map(function($r) {
        return [
            'id' => $r['id'],
            'name' => $r['name'],
            'category' => $r['category'],
            'description' => $r['description'] ?? '',
            'ingredients' => $r['ingredients_json'] ? json_decode($r['ingredients_json'], true) : [],
            'recipeIngredients' => $r['recipe_ingredients_json'] ? json_decode($r['recipe_ingredients_json'], true) : [],
            'tastingNotes' => $r['tasting_notes'] ?? '',
            'volume' => $r['volume'] ?? '',
            'alcoholContent' => $r['alcohol_content'] ?? '',
            'price' => (float)$r['price'],
            'stock' => (int)$r['stock'],
            'minStockAlert' => (int)$r['min_stock_alert'],
            'unit' => $r['unit'] ?? 'un',
            'imageUrl' => $r['image_url'] ?? '',
            'isAvailable' => (bool)$r['is_available'],
        ];
    }, $rows);

    sendResponse($products);
}

if ($method === 'POST') {
    $data = getRequestBody();
    $action = $data['action'] ?? 'save';

    if ($action === 'delete') {
        $id = $data['id'] ?? null;
        if (!$id) sendError('ID não informado');
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(['deleted' => $id]);
    }

    if ($action === 'toggle_availability') {
        $id = $data['id'] ?? null;
        if (!$id) sendError('ID não informado');
        $stmt = $pdo->prepare("UPDATE products SET is_available = NOT is_available WHERE id = ?");
        $stmt->execute([$id]);
        sendResponse(['toggled' => $id]);
    }

    // Salvar ou atualizar produto
    $p = $data['product'] ?? $data;
    if (empty($p['name'])) {
        sendError('Nome do drink/produto é obrigatório');
    }

    $id = !empty($p['id']) ? $p['id'] : 'prod-' . round(microtime(true) * 1000);
    $name = trim($p['name']);
    $category = $p['category'] ?? 'autorais';
    $description = $p['description'] ?? '';
    $ingredientsJson = !empty($p['ingredients']) ? json_encode($p['ingredients'], JSON_UNESCAPED_UNICODE) : null;
    $recipeIngredientsJson = !empty($p['recipeIngredients']) ? json_encode($p['recipeIngredients'], JSON_UNESCAPED_UNICODE) : null;
    $tastingNotes = $p['tastingNotes'] ?? null;
    $volume = $p['volume'] ?? null;
    $alcoholContent = $p['alcoholContent'] ?? null;
    $price = (float)($p['price'] ?? 0);
    $stock = (int)($p['stock'] ?? 0);
    $minStockAlert = (int)($p['minStockAlert'] ?? 0);
    $unit = $p['unit'] ?? 'un';
    $imageUrl = $p['imageUrl'] ?? '';
    $isAvailable = isset($p['isAvailable']) ? (int)$p['isAvailable'] : 1;

    $sql = "INSERT INTO products (
        id, name, category, description, ingredients_json, recipe_ingredients_json,
        tasting_notes, volume, alcohol_content, price, stock, min_stock_alert,
        unit, image_url, is_available
    ) VALUES (
        :id, :name, :category, :description, :ingredients_json, :recipe_ingredients_json,
        :tasting_notes, :volume, :alcohol_content, :price, :stock, :min_stock_alert,
        :unit, :image_url, :is_available
    ) ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        category = VALUES(category),
        description = VALUES(description),
        ingredients_json = VALUES(ingredients_json),
        recipe_ingredients_json = VALUES(recipe_ingredients_json),
        tasting_notes = VALUES(tasting_notes),
        volume = VALUES(volume),
        alcohol_content = VALUES(alcohol_content),
        price = VALUES(price),
        stock = VALUES(stock),
        min_stock_alert = VALUES(min_stock_alert),
        unit = VALUES(unit),
        image_url = VALUES(image_url),
        is_available = VALUES(is_available)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':name' => $name,
        ':category' => $category,
        ':description' => $description,
        ':ingredients_json' => $ingredientsJson,
        ':recipe_ingredients_json' => $recipeIngredientsJson,
        ':tasting_notes' => $tastingNotes,
        ':volume' => $volume,
        ':alcohol_content' => $alcoholContent,
        ':price' => $price,
        ':stock' => $stock,
        ':min_stock_alert' => $minStockAlert,
        ':unit' => $unit,
        ':image_url' => $imageUrl,
        ':is_available' => $isAvailable,
    ]);

    sendResponse(['id' => $id, 'message' => 'Produto salvo com sucesso!']);
}

sendError('Método não permitido', 405);
