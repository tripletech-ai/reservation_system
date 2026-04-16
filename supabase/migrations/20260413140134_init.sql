-- 1. 確保 NanoID 函數已建立 (如果之前跑過可以跳過)
create or replace function nanoid(size integer default 8)
returns text as $$
declare
  id text := '';
  i integer := 0;
  characters text := '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
begin
  while i < size loop
    id := id || substr(characters, get_byte(decode(md5(random()::text), 'hex'), i % 16) % 62 + 1, 1);
    i := i + 1;
  end loop;
  return id;
end;
$$ language plpgsql volatile;

DO $$ 
BEGIN

    -- 管理者資料表 (manager)
    CREATE TABLE IF NOT EXISTS public.manager (
        uid TEXT PRIMARY KEY DEFAULT nanoid(8),
        account TEXT UNIQUE,
        name TEXT,
        password TEXT,
        logo_url TEXT,
        website_name TEXT,
        google_calendar_id TEXT,
        bank_name TEXT,
        bank_account TEXT,
        bank_account_owner TEXT,
        line_notify_content TEXT,
        line_notify_default TEXT,
        line_channel_access_token TEXT,
        line_official_account TEXT,
        level INTEGER DEFAULT 1,
        questionnaire JSONB,
        create_at TIMESTAMPTZ DEFAULT NOW(),
        update_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 使用者資料表 (member)
    CREATE TABLE IF NOT EXISTS public.member (
        uid TEXT PRIMARY KEY DEFAULT nanoid(8),
        manager_uid TEXT REFERENCES public.manager(uid) ON DELETE CASCADE, -- 改為 TEXT
        name TEXT,
        line_uid TEXT,
        phone TEXT,
        email TEXT,
        questionnaire JSONB,
        status boolean,
        create_at TIMESTAMPTZ DEFAULT NOW(),
        update_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 預約資料表 (booking)
    CREATE TABLE IF NOT EXISTS public.booking (
        uid TEXT PRIMARY KEY DEFAULT nanoid(8),
        manager_uid TEXT REFERENCES public.manager(uid) ON DELETE CASCADE, -- 改為 TEXT
        name TEXT,
        line_uid TEXT,
        phone TEXT,
        google_calendar_event_id TEXT,
        booking_start_time TIMESTAMPTZ,
        booking_end_time TIMESTAMPTZ,
        service_item TEXT,
        service_computed_duration INTEGER,
        is_deposit_received BOOLEAN DEFAULT FALSE,
        status INTEGER DEFAULT 1,
        is_reminded_3d boolean DEFAULT false,
        is_reminded_1d boolean DEFAULT false,
        create_at TIMESTAMPTZ DEFAULT NOW(),
        update_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 快取預約資料表 (booking_cache)
    CREATE TABLE IF NOT EXISTS public.booking_cache (
        uid TEXT PRIMARY KEY DEFAULT nanoid(8),
        manager_uid TEXT REFERENCES public.manager(uid) ON DELETE CASCADE, -- 改為 TEXT
        booking_start_time TIMESTAMPTZ,
        booked_count INTEGER DEFAULT 0,
        create_at TIMESTAMPTZ DEFAULT NOW(),
        update_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (manager_uid, booking_start_time)
    );

    -- 營業時間選單 (schedule_menu)
    CREATE TABLE IF NOT EXISTS public.schedule_menu (
        uid TEXT PRIMARY KEY DEFAULT nanoid(8),
        manager_uid TEXT REFERENCES public.manager(uid) ON DELETE CASCADE, -- 改為 TEXT
        name TEXT,
        create_at TIMESTAMPTZ DEFAULT NOW(),
        update_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 具體營業時間 (schedule_time)
    CREATE TABLE IF NOT EXISTS public.schedule_time (
        uid TEXT PRIMARY KEY DEFAULT nanoid(8),
        schedule_menu_uid TEXT REFERENCES public.schedule_menu(uid) ON DELETE CASCADE, -- 改為 TEXT
        time_range TEXT,
        day_of_week INTEGER,
        max_capacity INTEGER DEFAULT 1,
        is_open BOOLEAN DEFAULT TRUE,
        last_booking_time TEXT,
        is_open_last_booking_time BOOLEAN DEFAULT TRUE,
        create_at TIMESTAMPTZ DEFAULT NOW(),
        update_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 覆蓋日程 (schedule_override)
    CREATE TABLE IF NOT EXISTS public.schedule_override (
        uid TEXT PRIMARY KEY DEFAULT nanoid(8), -- 改為 TEXT
        schedule_menu_uid TEXT REFERENCES public.schedule_menu(uid) ON DELETE CASCADE, -- 改為 TEXT
        override_start_time TIMESTAMPTZ,
        override_start_end TIMESTAMPTZ,
        max_capacity INTEGER,
        is_closed BOOLEAN DEFAULT FALSE,
        create_at TIMESTAMPTZ DEFAULT NOW(),
        update_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 事件 (event)
    CREATE TABLE IF NOT EXISTS public.event (
        uid TEXT PRIMARY KEY DEFAULT nanoid(8), -- 改為 TEXT
        manager_uid TEXT REFERENCES public.manager(uid) ON DELETE CASCADE, -- 改為 TEXT
        title TEXT,
        logo_url TEXT,
        line_liff_id TEXT,
        description TEXT,
        is_phone_required BOOLEAN DEFAULT TRUE,
        is_email_required BOOLEAN DEFAULT FALSE,
        schedule_menu_uid TEXT ,
        options JSONB,
        booking_dynamic_url TEXT,
        website_name TEXT,
        create_at TIMESTAMPTZ DEFAULT NOW(),
        update_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 預約取消backup(cancel,backup)
    CREATE TABLE IF NOT EXISTS public.booking_backup (
        uid TEXT PRIMARY KEY DEFAULT nanoid(8),
        manager_uid TEXT,
        name TEXT,
        line_uid TEXT,
        phone TEXT,
        booking_start_time TIMESTAMPTZ,
        booking_end_time TIMESTAMPTZ,
        status INTEGER DEFAULT 0,
        service_item TEXT,
        service_computed_duration INTEGER,
        create_at TIMESTAMPTZ DEFAULT NOW(),
        update_at TIMESTAMPTZ DEFAULT NOW()
    );


    -- 存line推播功能表(line_notify_procedure)
    CREATE TABLE IF NOT EXISTS public.line_notify_procedure (
        uid BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,        
        name TEXT,
        has_text boolean,
        sample TEXT,
        columns_json TEXT,
        no_data_key_type INTEGER,
        flex_message_type INTEGER,
        create_at TIMESTAMPTZ DEFAULT NOW(),
        update_at TIMESTAMPTZ DEFAULT NOW()
    );

END $$;




CREATE OR REPLACE FUNCTION public.save_schedule_config(config jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    menu_data jsonb := config->'menu';
    times_data jsonb := config->'times';
    m_uid text := menu_data->>'uid';
    m_manager_uid text := menu_data->>'manager_uid';
    m_name text := menu_data->>'name';
BEGIN
    -- 必要參數檢查
    IF m_uid IS NULL OR m_manager_uid IS NULL THEN
        RAISE EXCEPTION '必須提供 menu.uid 與 menu.manager_uid';
    END IF;

    -- UPSERT Menu
    INSERT INTO public.schedule_menu (uid, manager_uid, name, update_at)
    VALUES (m_uid, m_manager_uid, m_name, NOW())
    ON CONFLICT (uid) DO UPDATE 
    SET 
        name = EXCLUDED.name,
        update_at = NOW();

    -- Hard Sync Times: 先刪後增
    DELETE FROM public.schedule_time WHERE schedule_menu_uid = m_uid;

    IF times_data IS NOT NULL AND jsonb_array_length(times_data) > 0 THEN
        INSERT INTO public.schedule_time (
            uid, 
            schedule_menu_uid, 
            time_range, 
            day_of_week, 
            max_capacity, 
            is_open, 
            last_booking_time, 
            is_open_last_booking_time,
            create_at,
            update_at
        )
        SELECT 
            COALESCE(t->>'uid', nanoid(8)), 
            m_uid,
            t->>'time_range',
            (t->>'day_of_week')::integer,
            COALESCE((t->>'max_capacity')::integer, 1),
            COALESCE((t->>'is_open')::boolean, true),
            t->>'last_booking_time',
            COALESCE((t->>'is_open_last_booking_time')::boolean, true),
            NOW(),
            NOW()
        FROM jsonb_array_elements(times_data) AS t;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'menu_uid', m_uid
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_schedule(meun_uid text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    menus_json jsonb;
    times_json jsonb;
    override_times_json jsonb;
BEGIN
    -- 1. 取得該管理員的所有 Menu，並轉成 JSON 陣列
    SELECT jsonb_agg(m ORDER BY m.create_at DESC)
    INTO menus_json
    FROM (
        SELECT * FROM public.schedule_menu 
        WHERE uid = meun_uid
    ) m;

    -- 2. 如果有找到 Menu，則取得該 Menu 的所有時段
    SELECT jsonb_agg(t ORDER BY t.day_of_week ASC, t.time_range ASC)
    INTO times_json
    FROM (
        SELECT * FROM public.schedule_time 
        WHERE schedule_menu_uid = meun_uid
    ) t;

    SELECT jsonb_agg(t ORDER BY t.override_start_time ASC)
    INTO override_times_json
    FROM (
        SELECT * FROM public.schedule_override
        WHERE schedule_menu_uid = meun_uid
    ) t;

    -- 3. 回傳整合後的結果
    RETURN jsonb_build_object(
        'success', true,
        'menu', COALESCE(menus_json -> 0, '{}'::jsonb),
        'times', COALESCE(times_json, '[]'::jsonb),
        'overrides', COALESCE(override_times_json, '[]'::jsonb)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_member_and_get_event_schedule_info(
    p_line_uid TEXT,
    p_booking_dynamic_url TEXT,
    p_website_name TEXT,
    p_schedule_menu_uid TEXT
)
RETURNS TABLE (result JSONB) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. 參數檢查
    IF p_booking_dynamic_url IS NULL OR p_website_name IS NULL THEN
        RAISE EXCEPTION '必須提供 booking_dynamic_url 與 website_name';
    END IF;

    RETURN QUERY
    WITH target_event AS (
        SELECT * FROM event 
        WHERE booking_dynamic_url = p_booking_dynamic_url 
        AND website_name = p_website_name
        LIMIT 1
    ),
    target_member AS (
        SELECT m.* FROM member m
        -- 關鍵：這裡要 JOIN 前面定義好的 target_event
        INNER JOIN target_event te ON m.manager_uid = te.manager_uid
        WHERE m.line_uid = p_line_uid
        AND p_line_uid IS NOT NULL
        LIMIT 1
    )
    SELECT 
        jsonb_build_object(
            'success', TRUE,
            -- 修正點 1：只有當 line_uid 存在且資料庫有資料時才是會員
            'is_member', (
                CASE 
                    WHEN p_line_uid IS NULL THEN FALSE 
                    ELSE (m_info.uid IS NOT NULL) 
                END
            ),
            'event', to_jsonb(e.*),
            -- 修正點 2：改進 Manager 回傳邏輯
            'manager', (
                SELECT to_jsonb(mgr.*) 
                FROM manager mgr 
                WHERE mgr.uid = COALESCE(m_info.manager_uid, e.manager_uid) -- 優先用會員的，沒會員就用活動的
                LIMIT 1
            ),
            'schedule_override', (
                SELECT COALESCE(jsonb_agg(to_jsonb(so.*)), '[]'::jsonb)
                FROM schedule_override so 
                WHERE so.schedule_menu_uid = p_schedule_menu_uid
            ),   
            'schedule_time', (
                SELECT COALESCE(jsonb_agg(to_jsonb(st.*)), '[]'::jsonb)
                FROM schedule_time st 
                WHERE st.schedule_menu_uid = p_schedule_menu_uid
            ),
            'booking_cache', (
                SELECT COALESCE(jsonb_agg(to_jsonb(bc.*)), '[]'::jsonb)
                FROM booking_cache bc 
                WHERE bc.manager_uid = e.manager_uid
            )
        )
    FROM target_event e
    LEFT JOIN target_member m_info ON TRUE; 
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_booking(
    p_booking_data JSONB,
    p_max_capacity_array INTEGER[], 
    p_time_slot_interval INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager_uid TEXT;
    v_line_uid TEXT;
    v_phone TEXT;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_current_slot TIMESTAMPTZ;
    v_idx INTEGER := 1;
    v_booked_count INTEGER;
    v_new_booking_uid TEXT;
    v_google_token TEXT;
    v_line_token TEXT;
BEGIN
    -- 1. 解析基本資料
    v_manager_uid := p_booking_data->>'manager_uid';
    v_line_uid := p_booking_data->>'line_uid';
    v_phone := p_booking_data->>'phone';
    v_start_time := (p_booking_data->>'booking_start_time')::TIMESTAMPTZ;
    v_end_time := (p_booking_data->>'booking_end_time')::TIMESTAMPTZ;
    v_new_booking_uid := COALESCE(p_booking_data->>'uid', nanoid(8));

    -- 【自動補完邏輯】如果 line_uid 是空的，根據 phone 查詢 member table
    IF (v_line_uid IS NULL OR v_line_uid = '') AND v_phone IS NOT NULL THEN
        SELECT line_uid INTO v_line_uid 
        FROM public.member 
        WHERE phone = v_phone AND manager_uid = v_manager_uid
        LIMIT 1;
    END IF;

    -- 2. 核心鎖定 (針對 booking_cache 進行悲觀鎖，防止超賣)
    PERFORM 1 FROM public.booking_cache 
    WHERE manager_uid = v_manager_uid 
      AND booking_start_time >= v_start_time 
      AND booking_start_time < v_end_time
    FOR UPDATE;

    -- 3. 迴圈檢查各時段容量
    v_current_slot := v_start_time;
    WHILE v_current_slot < v_end_time LOOP
        -- 修正：如果陣列索引超出範圍，預設使用最後一個容量設定或預設 1
        -- 這裡維持你的原邏輯，但請確保 p_max_capacity_array 長度足夠
        SELECT booked_count INTO v_booked_count 
        FROM public.booking_cache
        WHERE manager_uid = v_manager_uid AND booking_start_time = v_current_slot;

        IF v_booked_count IS NOT NULL AND (v_booked_count + 1) > p_max_capacity_array[v_idx] THEN
            RAISE EXCEPTION '時段 % 已滿', to_char(v_current_slot, 'YYYY-MM-DD HH24:MI');
        END IF;
        
        v_current_slot := v_current_slot + (p_time_slot_interval || ' minutes')::interval;
        v_idx := v_idx + 1;
    END LOOP;

    -- 4. 執行實際預約單插入 (新增 status 欄位)
    INSERT INTO public.booking (
        uid, manager_uid, name, line_uid, phone, 
        booking_start_time, booking_end_time, 
        service_item, service_computed_duration,
        status -- <--- 新增欄位
    ) VALUES (
        v_new_booking_uid, v_manager_uid, p_booking_data->>'name', v_line_uid, v_phone, 
        v_start_time, v_end_time, p_booking_data->>'service_item', 
        (p_booking_data->>'service_computed_duration')::INTEGER,
        10 -- <--- 預設狀態設為 10 (預約中)
    );

    -- 5. 更新快取表 (booking_cache) 的預約人數
    v_current_slot := v_start_time;
    WHILE v_current_slot < v_end_time LOOP
        INSERT INTO public.booking_cache (uid, manager_uid, booking_start_time, booked_count, update_at)
        VALUES (nanoid(8), v_manager_uid, v_current_slot, 1, NOW())
        ON CONFLICT (manager_uid, booking_start_time) 
        DO UPDATE SET booked_count = booking_cache.booked_count + 1, update_at = NOW();
        
        v_current_slot := v_current_slot + (p_time_slot_interval || ' minutes')::interval;
    END LOOP;

    -- 6. 抓取通知所需的 Token
    SELECT google_calendar_id, line_channel_access_token 
    INTO v_google_token, v_line_token
    FROM public.manager 
    WHERE uid = v_manager_uid;

    -- 7. 回傳結果
    RETURN jsonb_strip_nulls(jsonb_build_object(
        'booking_success', true, 
        'msg', '預約成功', 
        'booking_uid', v_new_booking_uid,
        'status', 10, -- 回傳當前狀態
        'line_uid', NULLIF(v_line_uid, ''), 
        'google_calendar_id', NULLIF(v_google_token, ''),
        'line_channel_access_token', NULLIF(v_line_token, '')
    ));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('booking_success', false, 'msg', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_schedule(menu_uid TEXT)
RETURNS JSONB
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 執行刪除
    DELETE FROM public.schedule_menu 
    WHERE uid = menu_uid;
    
    -- 獲取受影響的列數
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    IF deleted_count > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Deleted successfully',
            'deleted_uid', menu_uid
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No record found'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.cancel_booking(
    _booking_uid TEXT,
    _manager_uid TEXT,           -- 新增參數：用來識別是哪個管理員執行的
    _time_slot_interval INTEGER,
    _delete_type INTEGER         -- 0: 移至備份並刪除, 1: 僅更新狀態
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    _booking_record RECORD;
    _manager_record RECORD;      -- 用來暫存管理員資料
    _result_msg TEXT;
    _event_id TEXT;
    -- _google_calendar_id TEXT;    -- 用來暫存日曆 ID
BEGIN
    -- 1. 取得預約完整資料
    SELECT * INTO _booking_record 
    FROM public.booking 
    WHERE uid = _booking_uid;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'msg', '找不到對應的預約資料');
    END IF;

    -- 2. 透過 session_uid 找到對應管理員的 google_calendar_id
    -- 假設你的 session 表與 manager 表有關聯 (例如透過 manager_uid)
    SELECT * INTO _manager_record
    FROM public.manager m
    WHERE m.uid = _manager_uid;

    -- 3. 暫存 Event ID
    _event_id := _booking_record.google_calendar_event_id;

    -- 4. 處理狀態更新與備份 (保持你原本的邏輯)
    IF _delete_type = 0 THEN
        INSERT INTO public.booking_backup (
            uid, manager_uid, name, line_uid, phone, 
            booking_start_time, booking_end_time, 
            service_item, service_computed_duration, 
            status, create_at, update_at
        ) VALUES (
            _booking_record.uid, _booking_record.manager_uid, _booking_record.name, 
            _booking_record.line_uid, _booking_record.phone, 
            _booking_record.booking_start_time, _booking_record.booking_end_time, 
            _booking_record.service_item, _booking_record.service_computed_duration,
            0, _booking_record.create_at, NOW()
        );

        DELETE FROM public.booking WHERE uid = _booking_uid;
        _result_msg := '預約已移至備份並成功刪除';
    ELSE
        UPDATE public.booking 
        SET status = 0, update_at = NOW() 
        WHERE uid = _booking_uid;
        _result_msg := '預約狀態已更新為：取消預約';
    END IF;

    -- 5. 同步扣減 booking_cache 計數 (釋放時段)
    WITH target_slots AS (
        SELECT generate_series(
            date_trunc('minute', _booking_record.booking_start_time), 
            _booking_record.booking_end_time - (_time_slot_interval || ' minutes')::interval,
            (_time_slot_interval || ' minutes')::interval
        ) AS slot_time
    )
    UPDATE public.booking_cache
    SET booked_count = booked_count - 1, update_at = NOW()
    WHERE manager_uid = _booking_record.manager_uid 
      AND booking_start_time IN (SELECT slot_time FROM target_slots);

    -- 6. 清理計數為 0 的快取
    DELETE FROM public.booking_cache 
    WHERE manager_uid = _booking_record.manager_uid 
      AND booked_count <= 0;

    -- 7. 回傳結果 (包含 Google Calendar 相關的所有資訊)
    RETURN jsonb_build_object(
        'success', true, 
        'msg', _result_msg, 
        'data', jsonb_build_object(
            'booking_uid', _booking_uid, 
            'new_status', 0,
            'google_calendar_id', _manager_record.google_calendar_id,   -- 新增回傳：讓前端知道要改哪個日曆
            'line_channel_access_token', _manager_record.line_channel_access_token,   -- 新增回傳：讓前端知道要改哪個日曆
            'google_calendar_event_id', _event_id        -- 原有的 Event ID
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false, 
        'error', '取消預約失敗: ' || SQLERRM
    );
END;
$$;



CREATE OR REPLACE FUNCTION public.line_get_booking_history(
    luid TEXT,          -- 原有的 LINE UID
    m_uid TEXT          -- 0. 新增的 manager_uid
)
RETURNS SETOF JSONB 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT jsonb_build_object(
        'uid', result.uid,
        'booking_date', result.booking_date,
        'service_name', result.service_name,
        'status', result.status,
        'source_table', result.source_table,
        'created_at', result.created_at,
        'manager_uid', result.manager_uid -- (選填) 如果前端也需要知道這筆是哪個 manager 的
    )
    FROM (
        -- 1. 從現有的 booking 抓取
        SELECT 
            b.uid, 
            b.booking_start_time AS booking_date, 
            b.service_item AS service_name,        
            b.status,
            'current'::TEXT AS source_table,
            b.create_at AS created_at,
            b.manager_uid                     -- 這裡假設欄位名稱為 manager_uid
        FROM public.booking b
        WHERE b.line_uid = luid 
          AND b.manager_uid = m_uid           -- 1. 新增搜尋條件

        UNION ALL

        -- 2. 從 booking_backup 抓取
        SELECT 
            bb.uid, 
            bb.booking_start_time AS booking_date, 
            bb.service_item AS service_name,       
            bb.status,
            'backup'::TEXT AS source_table,
            bb.create_at AS created_at,
            bb.manager_uid                    -- 這裡假設欄位名稱為 manager_uid
        FROM public.booking_backup bb
        WHERE bb.line_uid = luid 
          AND bb.manager_uid = m_uid          -- 1. 新增搜尋條件
        
        ORDER BY created_at DESC
    ) AS result;
END;
$$;

CREATE OR REPLACE FUNCTION public.line_get_member(
    luid TEXT,
    m_uid TEXT          -- 0. 新增的 manager_uid
)
RETURNS JSONB -- 修改回傳型別為 JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- 將查詢到的整列資料 (Row) 直接轉為 JSONB 物件
    SELECT to_jsonb(m) INTO result
    FROM public.member m
    WHERE m.line_uid = luid
        AND m.manager_uid = m_uid           -- 1. 新增搜尋條件
    LIMIT 1;

    -- 如果找不到資料，回傳空物件或 NULL
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;


CREATE OR REPLACE FUNCTION public.line_get_bookings(
    luid TEXT,          -- Line 使用者的 UID
    m_uid TEXT          
)
RETURNS SETOF JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT jsonb_build_object(
        'uid', b.uid,
        'name', b.name,
        'phone', b.phone,
        'booking_start_time', b.booking_start_time,
        'booking_end_time', b.booking_end_time,
        'service_item', b.service_item,
        'status', b.status,
        'is_deposit_received', b.is_deposit_received,
        'create_at', b.create_at
    )
    FROM public.booking b
    WHERE 
        b.line_uid = luid 
        AND b.manager_uid = m_uid             -- 條件 1: 匹配管理員 UID
        AND b.booking_end_time > NOW()        -- 條件 2: 結束時間大於現在 (尚未結束的預約)
        -- AND b.status != 0                     -- 條件 2: 狀態不等於 0 (排除已取消)
    ORDER BY b.booking_start_time ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_archive_old_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. 使用 WITH 語句一次性將「已過期」的預約搬移至備份表
    WITH moved_rows AS (
        INSERT INTO public.booking_backup (
            uid, manager_uid, name, line_uid, phone, 
            booking_start_time, booking_end_time, 
            service_item, service_computed_duration, 
            status, create_at, update_at
        )
        SELECT 
            uid, manager_uid, name, line_uid, phone, 
            booking_start_time, booking_end_time, 
            service_item, service_computed_duration, 
            status, -- ★ 搬移時強制將狀態改為 2 (已完成)
            create_at, NOW()
        FROM public.booking
        WHERE booking_end_time < NOW() - INTERVAL '1 day'
        RETURNING uid
    )
    -- 2. 從主表刪除剛才成功搬移的 UID
    DELETE FROM public.booking
    WHERE uid IN (SELECT uid FROM moved_rows);

    -- 3. ★ 新增：刪除備份表中超過 30 天的資料
    DELETE FROM public.booking_backup
    WHERE booking_end_time < NOW() - INTERVAL '30 days';

    -- 4. 清理過舊的 cache 避免佔空間
    DELETE FROM public.booking_cache 
    WHERE booking_start_time < NOW() - INTERVAL '7 days';

END;
$$;


CREATE OR REPLACE FUNCTION public.update_booking_status(
    _booking_uid TEXT,
    _new_status INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    _result RECORD;
BEGIN
    -- 1. 更新 booking table 的狀態，同時透過 JOIN 取得 manager 的 google_calendar_id
    -- 使用 RETURNING 子句可以直接在更新時抓出相關欄位，效率最高
    UPDATE public.booking b
    SET 
        status = _new_status,
        update_at = NOW()
    FROM public.manager m
    WHERE b.manager_uid = m.uid
      AND b.uid = _booking_uid
    RETURNING 
        b.uid, 
        b.status,
        b.google_calendar_event_id, 
        m.line_channel_access_token,
        m.google_calendar_id INTO _result;

    -- 2. 檢查是否有找到並更新資料
    IF _result IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'msg', '找不到該預約編號或關聯的管理員資料'
        );
    END IF;

    -- 3. 回傳成功結果與同步日曆所需的 ID
    RETURN jsonb_build_object(
        'success', true,
        'msg', '狀態更新成功',
        'data', jsonb_build_object(
            'booking_uid', _result.uid,
            'new_status', _result.status,
            'line_channel_access_token', _result.line_channel_access_token,
            'google_calendar_id', _result.google_calendar_id,
            'google_calendar_event_id', _result.google_calendar_event_id
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'msg', '更新失敗: ' || SQLERRM
    );
END;
$$;


DO $$ 
BEGIN
    -------------------------------------------------------
    -- 1. 為所有表的 uid (Primary Key) 建立索引
    -- 注意：PostgreSQL 預設會為 PRIMARY KEY 建立唯一索引
    -- 這裡我們補強外鍵與常用查詢欄位的索引
    -------------------------------------------------------

    -- Manager 表 (account 常被用於登入查詢)
    CREATE INDEX IF NOT EXISTS idx_manager_account ON public.manager(account);

    -- Member 表
    CREATE INDEX IF NOT EXISTS idx_member_manager_uid ON public.member(manager_uid);
    CREATE INDEX IF NOT EXISTS idx_member_line_uid ON public.member(line_uid);
    CREATE INDEX IF NOT EXISTS idx_member_phone ON public.member(phone);

    -- Booking 表 (核心查詢表)
    CREATE INDEX IF NOT EXISTS idx_booking_manager_uid ON public.booking(manager_uid);
    CREATE INDEX IF NOT EXISTS idx_booking_line_uid ON public.booking(line_uid);
    CREATE INDEX IF NOT EXISTS idx_booking_start_time ON public.booking(booking_start_time);
    CREATE INDEX IF NOT EXISTS idx_booking_status ON public.booking(status);

    -- Booking_Cache 表 (鎖定與容量檢查)
    -- 建立複合索引提升快取搜尋效能
    CREATE INDEX IF NOT EXISTS idx_booking_cache_manager_uid ON public.booking_cache(manager_uid);
    CREATE INDEX IF NOT EXISTS idx_booking_cache_start_time ON public.booking_cache(booking_start_time);
    -- 針對併發檢查最常用的複合索引
    CREATE INDEX IF NOT EXISTS idx_booking_cache_manager_start ON public.booking_cache(manager_uid, booking_start_time);

    -- Schedule 相關
    CREATE INDEX IF NOT EXISTS idx_schedule_menu_manager_uid ON public.schedule_menu(manager_uid);
    CREATE INDEX IF NOT EXISTS idx_schedule_time_menu_uid ON public.schedule_time(schedule_menu_uid);
    CREATE INDEX IF NOT EXISTS idx_schedule_override_menu_uid ON public.schedule_override(schedule_menu_uid);
    CREATE INDEX IF NOT EXISTS idx_schedule_override_start_time ON public.schedule_override(override_start_time);

    -- Event 表
    CREATE INDEX IF NOT EXISTS idx_event_manager_uid ON public.event(manager_uid);
    -- 指定建立的索引：booking_dynamic_url 與 website_name
    CREATE INDEX IF NOT EXISTS idx_event_booking_url ON public.event(booking_dynamic_url);
    CREATE INDEX IF NOT EXISTS idx_event_website_name ON public.event(website_name);

    -- Booking_Backup 表
    CREATE INDEX IF NOT EXISTS idx_booking_backup_manager_uid ON public.booking_backup(manager_uid);
    CREATE INDEX IF NOT EXISTS idx_booking_backup_line_uid ON public.booking_backup(line_uid);
    CREATE INDEX IF NOT EXISTS idx_booking_backup_start_time ON public.booking_backup(booking_start_time);

END $$;


-- 你可以執行以下 SQL 來查看目前資料表上的索引清單：
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 新增排程
-- 你的排程目前是 0 3 * * *，如前所述，Supabase 預設是 UTC 時區，所以這會在 台灣時間上午 11:00 執行。如果你希望是 台灣時間凌晨 3:00 執行，請將排程改為：
-- '0 16 * * *' (因為 16:00 + 8小時 = 隔天 03:00)。
SELECT cron.schedule(
  'daily-archive-task-midnight', -- 任務名稱
  '0 10 * * *',                  -- 分 時 日 月 週 (UTC 16:00 = 台灣 00:00)
  'SELECT public.auto_archive_old_bookings()'
);


-- 查詢排程
SELECT * FROM cron.job;

-- 這裡的 1 就是你剛剛拿到的 Job ID
-- SELECT cron.unschedule(1);

