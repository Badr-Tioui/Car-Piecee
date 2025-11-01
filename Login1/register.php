<?php
include 'config.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $full_name = $_POST['fullname'];
    $username = $_POST['username'];
    $email = $_POST['email'];
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];

    if ($password !== $confirm_password) {
        echo "<script>alert('Les mots de passe ne correspondent pas !'); window.history.back();</script>";
        exit();
    }

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("INSERT INTO utilisateur (full_name, username, email, passworde,confirm_password) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $full_name, $username, $email, $password, $confirm_password);

    if ($stmt->execute()) {
    // Redirection vers la page principale après inscription
    header("Location: ../loay.html");
    exit(); // toujours mettre exit après header pour arrêter le script
} else {
    echo "<script>alert('Erreur : cet email existe déjà !'); window.history.back();</script>";
}


    $stmt->close();
    $conn->close();
}
?>
