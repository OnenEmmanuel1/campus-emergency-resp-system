-- Campus Emergency Response and Reporting System (CERRS) Seeds
USE campus_alert;

-- Clear tables first
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notifications;
TRUNCATE TABLE incident_status_log;
TRUNCATE TABLE incidents;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Password for all seed users is 'password123'
-- Hash: $2a$10$uNKGdk5lp7eNNFx46k2afeO6x.YX8Rhp1yqGX5GRS5kyEi57llD7O

-- Insert Users
INSERT INTO users (id, name, email, password_hash, role, response_unit_type) VALUES
(1, 'Admin User', 'admin@campusalert.edu', '$2a$10$uNKGdk5lp7eNNFx46k2afeO6x.YX8Rhp1yqGX5GRS5kyEi57llD7O', 'admin', NULL),
(2, 'Security Dispatcher', 'security@campusalert.edu', '$2a$10$uNKGdk5lp7eNNFx46k2afeO6x.YX8Rhp1yqGX5GRS5kyEi57llD7O', 'response_unit', 'security'),
(3, 'Medical Response Team', 'medical@campusalert.edu', '$2a$10$uNKGdk5lp7eNNFx46k2afeO6x.YX8Rhp1yqGX5GRS5kyEi57llD7O', 'response_unit', 'medical'),
(4, 'Fire Marshall', 'fire@campusalert.edu', '$2a$10$uNKGdk5lp7eNNFx46k2afeO6x.YX8Rhp1yqGX5GRS5kyEi57llD7O', 'response_unit', 'fire'),
(5, 'John Doe', 'john@campusalert.edu', '$2a$10$uNKGdk5lp7eNNFx46k2afeO6x.YX8Rhp1yqGX5GRS5kyEi57llD7O', 'reporter', NULL),
(6, 'Jane Smith', 'jane@campusalert.edu', '$2a$10$uNKGdk5lp7eNNFx46k2afeO6x.YX8Rhp1yqGX5GRS5kyEi57llD7O', 'reporter', NULL),
(7, 'Prof. Charles', 'charles@campusalert.edu', '$2a$10$uNKGdk5lp7eNNFx46k2afeO6x.YX8Rhp1yqGX5GRS5kyEi57llD7O', 'reporter', NULL);

-- Insert Incidents
-- Incident 1: Reported fire, now acknowledged (Fire marshall)
INSERT INTO incidents (id, reporter_id, category, description, latitude, longitude, severity, status, created_at) VALUES
(1, 6, 'fire', 'Small electrical fire in Science Lab 2. Extinguisher used but smoke remains.', 40.712776, -74.005974, 'high', 'acknowledged', DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- Incident 2: Reported medical, now dispatched (Medical response team)
INSERT INTO incidents (id, reporter_id, category, description, latitude, longitude, severity, status, created_at) VALUES
(2, 5, 'medical', 'A student collapsed near the basketball court in the Gymnasium.', 40.713000, -74.006100, 'critical', 'dispatched', DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- Incident 3: Reported security, now in_progress (Security dispatcher)
INSERT INTO incidents (id, reporter_id, category, description, latitude, longitude, severity, status, created_at) VALUES
(3, 7, 'security', 'Suspicious individual tailgating employees in the Research Wing.', 40.712500, -74.005800, 'medium', 'in_progress', DATE_SUB(NOW(), INTERVAL 45 MINUTE));

-- Incident 4: Reported accident, now resolved (Medical/Security response team)
INSERT INTO incidents (id, reporter_id, category, description, latitude, longitude, severity, status, created_at) VALUES
(4, 5, 'accident', 'Slipped on a wet floor in the main cafeteria corridor.', 40.712900, -74.005500, 'low', 'resolved', DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- Incident 5: Reported security, just reported (waiting for security dispatch)
INSERT INTO incidents (id, reporter_id, category, description, latitude, longitude, severity, status, created_at) VALUES
(5, 6, 'security', 'Aggressive trespasser near the main campus entry gate.', 40.712100, -74.004900, 'critical', 'reported', DATE_SUB(NOW(), INTERVAL 5 MINUTE));

-- Insert Incident Status Logs (audit trails)
-- For Incident 4 (detailed history)
INSERT INTO incident_status_log (incident_id, status, updated_by_user_id, updated_at) VALUES
(4, 'reported', 5, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(4, 'acknowledged', 3, DATE_SUB(NOW(), INTERVAL 165 MINUTE)),
(4, 'dispatched', 3, DATE_SUB(NOW(), INTERVAL 150 MINUTE)),
(4, 'in_progress', 3, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(4, 'resolved', 3, DATE_SUB(NOW(), INTERVAL 90 MINUTE));

-- For other incidents (initial status logs)
INSERT INTO incident_status_log (incident_id, status, updated_by_user_id, updated_at) VALUES
(1, 'reported', 6, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 'acknowledged', 4, DATE_SUB(NOW(), INTERVAL 105 MINUTE)),
(2, 'reported', 5, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 'acknowledged', 3, DATE_SUB(NOW(), INTERVAL 50 MINUTE)),
(2, 'dispatched', 3, DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(3, 'reported', 7, DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(3, 'acknowledged', 2, DATE_SUB(NOW(), INTERVAL 40 MINUTE)),
(3, 'dispatched', 2, DATE_SUB(NOW(), INTERVAL 35 MINUTE)),
(3, 'in_progress', 2, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(5, 'reported', 6, DATE_SUB(NOW(), INTERVAL 5 MINUTE));

-- Insert Notifications for ongoing incidents
-- Incident 1: Notify Fire Marshall (User ID 4)
INSERT INTO notifications (incident_id, target_user_id, dispatched_at, read_at) VALUES
(1, 4, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 105 MINUTE));

-- Incident 2: Notify Medical Response Team (User ID 3)
INSERT INTO notifications (incident_id, target_user_id, dispatched_at, read_at) VALUES
(2, 3, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 50 MINUTE));

-- Incident 3: Notify Security Dispatcher (User ID 2)
INSERT INTO notifications (incident_id, target_user_id, dispatched_at, read_at) VALUES
(3, 2, DATE_SUB(NOW(), INTERVAL 45 MINUTE), DATE_SUB(NOW(), INTERVAL 40 MINUTE));

-- Incident 5: Notify Security Dispatcher (User ID 2) - unread
INSERT INTO notifications (incident_id, target_user_id, dispatched_at, read_at) VALUES
(5, 2, DATE_SUB(NOW(), INTERVAL 5 MINUTE), NULL);
