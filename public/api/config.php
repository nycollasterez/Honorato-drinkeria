<?php
/**
 * HONORATO DRINKERIA - CONFIGURAÇÃO DO BANCO DE DADOS (HOSTGATOR)
 * 
 * Preencha com os dados do MySQL criado no cPanel da HostGator:
 * 1. cPanel > Bancos de Dados MySQL > Criar Banco de Dados (ex: seunome_honorato)
 * 2. Criar Usuário do MySQL (ex: seunome_bar) e definir senha forte
 * 3. Adicionar Usuário ao Banco de Dados com privilégio "TODOS OS PRIVILÉGIOS"
 */

// Permite conexões CORS (necessário caso use subdomínio ou porta diferente)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Responder requisições OPTIONS de pré-voo do navegador
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ========================================================
// CONFIGURE AQUI SUAS CREDENCIAIS DO CPANEL DA HOSTGATOR
// Se existir o arquivo config.local.php, ele carrega de lá
// para não dar conflito nas atualizações do Git
// ========================================================
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

if (!defined('DB_HOST')) define('DB_HOST', 'localhost');
if (!defined('DB_NAME')) define('DB_NAME', 'honorato_drinkeria');
if (!defined('DB_USER')) define('DB_USER', 'honorato_user');
if (!defined('DB_PASS')) define('DB_PASS', 'SuaSenhaSegura@2026');

/**
 * Retorna uma conexão PDO ativa com o MySQL
 */
function getDatabaseConnection($suppressExit = false) {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);

        // Auto-instalação: se o banco for novo e não tiver tabelas, cria tudo a partir de schema.sql
        try {
            $checkStmt = $pdo->query("SHOW TABLES LIKE 'products'");
            if ($checkStmt && $checkStmt->rowCount() === 0) {
                $schemaFile = __DIR__ . '/schema.sql';
                if (file_exists($schemaFile)) {
                    $sql = file_get_contents($schemaFile);
                    $pdo->exec($sql);
                }
            }
        } catch (Exception $e) {
            // Continua normalmente se o schema falhar ou já existir
        }

        return $pdo;
    } catch (PDOException $e) {
        if ($suppressExit) {
            throw $e;
        }
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Falha na conexão com o banco MySQL HostGator: ' . $e->getMessage(),
            'hint' => 'Verifique se o banco e usuário foram criados no cPanel e se os dados em api/config.php estão corretos.'
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
}

/**
 * Helper para obter JSON enviado no corpo da requisição POST/PUT
 */
function getRequestBody() {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Helper para responder com sucesso
 */
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => true,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Helper para responder com erro
 */
function sendError($message, $statusCode = 400) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'error' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit();
}
