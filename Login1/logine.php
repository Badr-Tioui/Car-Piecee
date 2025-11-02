<?php
session_start();
include('config.php'); // connexion à la base

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['email'];
    $passworde = $_POST['passworde'];

    // Vérifie si l'utilisateur existe
    $stmt = $conn->prepare("SELECT * FROM utilisateur WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows == 1) {
        $user = $result->fetch_assoc();

        // Vérifie le mot de passe
        if (password_verify($passworde, $user['passworde'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];

            // Redirection vers la page principale
            header("Location: ../loay.html");
            exit();
        } else {
            echo "<script>alert('Mot de passe incorrect !'); window.history.back();</script>";
        }
    } else {
        echo "<script>alert('Email introuvable !'); window.history.back();</script>";
    }
}
?>
