-- Probar la query exacta que usa la aplicación (ejecuta solo esta query)
SELECT 
    id, 
    title, 
    description, 
    salary_range, 
    experience_level, 
    seniority, 
    flyer_url, 
    flyer_position, 
    service_order_code, 
    start_date, 
    end_date, 
    status, 
    vacancies, 
    google_drive_folder_id, 
    google_drive_folder_name, 
    published_date, 
    need_identified_date, 
    client_id, 
    created_at
FROM processes
WHERE app_name = 'Opalo ATS'
ORDER BY created_at DESC
LIMIT 200;
