<?php
/**
 * Teste e Diagnóstico de Conexão com o Banco de Dados MySQL na HostGator
 * Acesse via navegador: https://seusite.com.br/drinkeria/api/test_db.php
 */
require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=UTF-8');

$status = [];
$status['php_version'] = PHP_VERSION;
$status['db_host'] = defined('DB_HOST') ? DB_HOST : 'Não definido';
$status['db_name'] = defined('DB_NAME') ? DB_NAME : 'Não definido';
$status['db_user'] = defined('DB_USER') ? DB_USER : 'Não definido';

$connected = false;
$errorMsg = '';
$tables = [];
$stats = [];
$installSuccess = false;

try {
    $pdo = getDatabaseConnection(true);
    $connected = true;

    // Se o usuário clicou para forçar instalação das tabelas
    if (isset($_GET['action']) && $_GET['action'] === 'install') {
        $schemaFile = __DIR__ . '/schema.sql';
        if (file_exists($schemaFile)) {
            $sql = file_get_contents($schemaFile);
            $pdo->exec($sql);
            $installSuccess = true;
        }
    }

    // Listar tabelas criadas
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (in_array('products', $tables)) {
        $stats['products'] = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
    }
    if (in_array('comandas', $tables)) {
        $stats['comandas'] = $pdo->query("SELECT COUNT(*) FROM comandas")->fetchColumn();
    }
    if (in_array('staff_pins', $tables)) {
        $stats['staff_pins'] = $pdo->query("SELECT COUNT(*) FROM staff_pins")->fetchColumn();
    }
} catch (Exception $e) {
    $errorMsg = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnóstico MySQL HostGator - Honorato Drinkeria</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #fff; padding: 20px; line-height: 1.5; }
    .card { max-width: 680px; margin: 20px auto; background: #0a0a0a; border: 1px solid #262626; padding: 28px; border-radius: 6px; }
    h1 { font-size: 20px; border-bottom: 1px solid #262626; padding-bottom: 12px; margin-top: 0; letter-spacing: 1px; }
    .badge { display: inline-block; padding: 5px 12px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
    .badge-ok { background: #fff; color: #000; }
    .badge-err { background: #b71c1c; color: #fff; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
    td, th { padding: 10px 12px; border-bottom: 1px solid #1a1a1a; text-align: left; }
    th { color: #888; width: 35%; font-weight: 500; }
    td { font-family: monospace; }
    .tip { background: #141414; padding: 16px; border-left: 3px solid #fff; margin-top: 20px; font-size: 13px; color: #ccc; }
    .tip-err { background: #200b0b; border-left: 3px solid #f44336; color: #ffcdd2; }
    .tip-ok { background: #0e1e0e; border-left: 3px solid #4caf50; color: #c8e6c9; }
    a { color: #fff; text-decoration: underline; }
    .btn { display: inline-block; background: #fff; color: #000; text-decoration: none; padding: 10px 18px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 15px; cursor: pointer; }
    .btn:hover { background: #ccc; }
    code { background: #1a1a1a; padding: 2px 6px; border: 1px solid #333; font-family: monospace; color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>HONORATO DRINKERIA · DIAGNÓSTICO MYSQL</h1>
    
    <div style="margin: 20px 0;">
      Status da Conexão: 
      <?php if ($connected): ?>
        <span class="badge badge-ok">CONECTADO AO MYSQL COM SUCESSO</span>
      <?php else: ?>
        <span class="badge badge-err">FALHA NA CONEXÃO MYSQL</span>
      <?php endif; ?>
    </div>

    <?php if ($installSuccess): ?>
      <div class="tip tip-ok">
        ✓ <strong>Tabelas e produtos criados com sucesso!</strong> O banco de dados agora está totalmente populado.
      </div>
    <?php endif; ?>

    <table>
      <tr><th>Versão do PHP:</th><td><?= htmlspecialchars($status['php_version']) ?></td></tr>
      <tr><th>Servidor (DB_HOST):</th><td><?= htmlspecialchars($status['db_host']) ?></td></tr>
      <tr><th>Banco (DB_NAME):</th><td><?= htmlspecialchars($status['db_name']) ?></td></tr>
      <tr><th>Usuário (DB_USER):</th><td><?= htmlspecialchars($status['db_user']) ?></td></tr>
      <tr>
        <th>Tabelas Encontradas:</th>
        <td>
          <strong><?= count($tables) ?></strong>
          <?php if (count($tables) > 0): ?>
            <span style="color:#888; font-size:11px; display:block; margin-top:4px;"><?= implode(', ', $tables) ?></span>
          <?php endif; ?>
        </td>
      </tr>
      <?php if (isset($stats['products'])): ?>
        <tr><th>Produtos no Cardápio:</th><td><?= $stats['products'] ?> itens</td></tr>
      <?php endif; ?>
      <?php if (isset($stats['comandas'])): ?>
        <tr><th>Comandas no Sistema:</th><td><?= $stats['comandas'] ?> comandas</td></tr>
      <?php endif; ?>
    </table>

    <?php if (!$connected): ?>
      <div class="tip tip-err">
        <strong>Mensagem de Erro do MySQL:</strong><br>
        <code style="display:block; margin:8px 0; padding:8px;"><?= htmlspecialchars($errorMsg) ?></code>
        
        <br><strong>Checklist para resolver no cPanel da HostGator:</strong><br>
        1. <strong>Prefixo do cPanel:</strong> Na HostGator, o nome do banco e o usuário sempre começam com o seu usuário cPanel.<br>
           Exemplo: se o seu cPanel for <code>usuario</code>, o banco é <code>usuario_drinkeria</code> e NÃO apenas <code>drinkeria</code>.<br><br>
        2. <strong>Vincular Usuário ao Banco:</strong> No cPanel &gt; <em>Bancos de Dados MySQL</em>, role até a seção <strong>"Adicionar Usuário ao Banco de Dados"</strong>, selecione o usuário e o banco, clique em <strong>Adicionar</strong> e marque a caixinha <strong>TODOS OS PRIVILÉGIOS</strong>.<br><br>
        3. <strong>Arquivo de Configuração:</strong> Abra o Gerenciador de Arquivos do cPanel, vá em <code>public_html/drinkeria/api/config.php</code> e confira se <code>DB_NAME</code>, <code>DB_USER</code> e <code>DB_PASS</code> estão corretos.
      </div>
    <?php elseif (count($tables) === 0): ?>
      <div class="tip">
        <strong>Atenção:</strong> O MySQL conectou, mas as tabelas ainda não foram criadas neste banco.<br>
        Você pode criá-las agora mesmo com 1 clique abaixo:<br>
        <a href="?action=install" class="btn">Criar Tabelas e Produtos Automaticamente</a>
      </div>
    <?php else: ?>
      <div class="tip tip-ok">
        <strong>Tudo Pronto!</strong> O banco de dados está ativo e sincronizando em tempo real com todos os celulares e computadores.<br><br>
        <a href="../" class="btn" style="color:#000;">Abrir Sistema Drinkeria</a>
      </div>
    <?php endif; ?>
  </div>
</body>
</html>
