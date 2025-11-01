<?php
$servername = "localhost";
$username = "root"; // par défaut sur XAMPP/WAMP
$password = "";     // par défaut vide sur XAMPP/WAMP
$dbname = "login_db"; // nom de ta base de données

// Créer la connexion
$conn = new mysqli($servername, $username, $password, $dbname);

// Vérifier la connexion
if ($conn->connect_error) {
    die("Échec de la connexion : " . $conn->connect_error);
}
?>