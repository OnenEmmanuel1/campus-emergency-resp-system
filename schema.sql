-- Campus Emergency Response and Reporting System (CERRS) Schema

CREATE DATABASE IF NOT EXISTS campus_alert;
USE campus_alert;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('reporter', 'response_unit', 'admin') NOT NULL DEFAULT 'reporter',
    response_unit_type ENUM('security', 'medical', 'fire') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    category ENUM('fire', 'medical', 'security', 'accident', 'other') NOT NULL,
    description TEXT NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'low',
    status ENUM('reported', 'acknowledged', 'dispatched', 'in_progress', 'resolved') NOT NULL DEFAULT 'reported',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Incident Status Log (Audit Trail)
CREATE TABLE IF NOT EXISTS incident_status_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    status ENUM('reported', 'acknowledged', 'dispatched', 'in_progress', 'resolved') NOT NULL,
    updated_by_user_id INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id INT NOT NULL,
    target_user_id INT NOT NULL,
    dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
