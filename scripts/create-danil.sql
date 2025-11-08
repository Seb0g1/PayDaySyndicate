-- Создание главного пользователя "Данил" с ролью DIRECTOR
-- Пароль: CGJ-Ge-90 (хэш bcrypt)

-- Проверяем, существует ли пользователь
DO $$
DECLARE
    user_exists BOOLEAN;
    user_id TEXT;
    hashed_password TEXT := '$2a$10$rK8X8X8X8X8X8X8X8X8X8u8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X'; -- Замените на реальный хэш
BEGIN
    -- Проверяем существование пользователя
    SELECT EXISTS(SELECT 1 FROM "User" WHERE name = 'Данил') INTO user_exists;
    
    IF user_exists THEN
        -- Обновляем существующего пользователя
        UPDATE "User"
        SET 
            password = '$2a$10$rK8X8X8X8X8X8X8X8X8X8u8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X',
            role = 'DIRECTOR'
        WHERE name = 'Данил';
        
        RAISE NOTICE 'Пользователь "Данил" обновлен с ролью DIRECTOR';
    ELSE
        -- Создаем нового пользователя
        INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
        VALUES (
            gen_random_uuid()::TEXT,
            'Данил',
            'danil@admin.local',
            '$2a$10$rK8X8X8X8X8X8X8X8X8X8u8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X',
            'DIRECTOR',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Пользователь "Данил" создан с ролью DIRECTOR';
    END IF;
END $$;

