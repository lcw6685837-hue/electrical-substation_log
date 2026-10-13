// ===== 수전일지 모바일(현장 패트롤) 입력 화면 =====
// 입력칸 id와 저장 경로가 PC 화면(index.html)과 같아서 서로 같은 데이터를 실시간으로 공유한다.

// 로그인되지 않았을 때 이동할 로그인 페이지 경로 (이 페이지 기준 상대경로)
const LOGIN_PAGE_URL = "login.html";

const db = firebase.database();

// ===== 로그아웃 =====
function logout() {
    firebase.auth().signOut();
}

// ===== 화면 구성 정의 =====
const V = (id, label = '전압') => ({ id, label, unit: 'V' });
const A = (id, label = '전류') => ({ id, label, unit: 'A' });
const T = (id, label = '') => ({ id, label, text: true });
const VA = (name, prefix) => ({ name, fields: [V(prefix + '_v'), A(prefix + '_a')] });

// 1. 수전반 / 변압기 (PC 화면의 한 줄 = 카드 1장)
function s1Card(r, title, hasEq) {
    const p = `s1_${r}`;
    return {
        title, time: p + '_time', eq: hasEq ? p + '_eq' : null,
        groups: [
            VA('고압반(800KVA)', p + '_hv800'),
            VA('고압반(3000KVA)', p + '_hv3000'),
            VA('저압반(ACB)', p + '_lv'),
            { name: '변압기', cols: 3, fields: [T(p + '_tr_oil', '오일누유'), T(p + '_tr_temp', '온도이상'), T(p + '_tr_noise', '소음/진동')] },
            { name: '특기사항', cols: 1, fields: [T(p + '_note')] }
        ]
    };
}

// 2. #1~#5 COMPRESSOR
function s2Card(r, title) {
    const p = `s2_${r}`;
    return {
        title, time: p + '_time', eq: p + '_eq',
        groups: [1, 2, 3, 4, 5].map(n => ({
            name: `#${n} COMPRESSOR`,
            fields: [
                V(`${p}_c${n}_co2_v`, 'CO2 전압'), A(`${p}_c${n}_co2_a`, 'CO2 전류'),
                V(`${p}_c${n}_nh2_v`, 'NH3 전압'), A(`${p}_c${n}_nh2_a`, 'NH3 전류')
            ]
        }))
    };
}

// 3. COOLING TOWER (구공장 / 신공장)
function s3Card(k, title) {
    const p = `s3_${k}`;
    return {
        title, eq: p + '_eq',
        groups: [
            VA('#1 COOLING TOWER · PUMP #2', p + '_ct1_pump'),
            { name: '#1 COOLING TOWER · COOLING FAN', fields: [V(p + '_ct1_fan_v', '공통 전압'), A(p + '_ct1_fan1_a', '#1 전류'), A(p + '_ct1_fan2_a', '#2 전류'), A(p + '_ct1_fan3_a', '#3 전류')] },
            VA('#2 COOLING TOWER · PUMP #2', p + '_ct2_pump'),
            { name: '#2 COOLING TOWER · FAN', fields: [A(p + '_ct2_fan_a')] }
        ]
    };
}

// 4. 진공펌프
function s4Card(k, title, vpName) {
    const p = `s4_${k}`;
    return {
        title,
        groups: [
            { name: '전류', cols: 3, fields: [1, 2, 3, 4, 5].map(n => A(`${p}_p${n}`, `#${n}`)) },
            { name: vpName, fields: [V(p + '_note')] }
        ]
    };
}

const PANELS = [
    { tab: '수전반', cards: [s1Card('r1', '점검 ①', true), s1Card('r2', '점검 ②', true), s1Card('r3', '#1 PSA(A/B) MOTOR', false), s1Card('r4', '#2 PSA(A/B) MOTOR', false)] },
    { tab: 'COMP', cards: [s2Card('r1', '#1~#5 COMPRESSOR ①'), s2Card('r2', '#1~#5 COMPRESSOR ②')] },
    {
        tab: '냉각탑', cards: [
            s3Card('old', '구공장'),
            s3Card('new', '신공장'),
            {
                title: '#3 COMPRESSOR',
                groups: [
                    { name: 'PUMP', cols: 3, fields: [T('s3_c3_pump_no', '번호 #'), V('s3_old_c3_pump'), A('s3_new_c3_pump')] },
                    { name: 'FAN', cols: 3, fields: [T('s3_c3_fan_no', '번호 #'), V('s3_old_c3_fan'), A('s3_new_c3_fan')] }
                ]
            },
            { title: '특기사항', groups: [{ cols: 1, fields: [T('s3_hnote1', '①'), T('s3_hnote2', '②'), T('s3_old_note', '③'), T('s3_new_note', '④')] }] }
        ]
    },
    { tab: '진공펌프', cards: [s4Card('old', '구진공펌프', '(구) V/P #1'), s4Card('new', '신진공펌프', '(신) V/P #1')] },
    { tab: '특기사항', note: 's5_note' }
];

// ===== 화면 생성 =====
function fieldHtml(f) {
    const label = f.label ? `<label for="${f.id}">${f.label}${f.unit ? `<em>${f.unit}</em>` : ''}</label>` : '';
    const attrs = f.text ? 'class="sync-item txt left"' : 'class="sync-item num" inputmode="decimal"';
    return `<div class="fld">${label}<input id="${f.id}" ${attrs} placeholder=" " enterkeyhint="next" autocomplete="off"></div>`;
}

function groupHtml(g) {
    const name = g.name ? `<div class="grp-name">${g.name}</div>` : '';
    return `<div class="grp">${name}<div class="grid c${g.cols || 2}">${g.fields.map(fieldHtml).join('')}</div></div>`;
}

function metaHtml(card) {
    if (!card.time && !card.eq) return '';
    let html = '';
    if (card.time) {
        html += `<div class="fld"><label for="${card.time}">시간</label><div class="time-wrap">`
            + `<input id="${card.time}" class="sync-item txt" placeholder=" " enterkeyhint="next" autocomplete="off">`
            + `<button type="button" class="now-btn" data-for="${card.time}">지금</button></div></div>`;
    }
    if (card.eq) html += fieldHtml({ id: card.eq, label: '구분', text: true });
    return `<div class="grp"><div class="grid c${card.time && card.eq ? 2 : 1}">${html}</div></div>`;
}

function cardHtml(card) {
    return `<section class="card"><h2 class="card-title">${card.title}</h2>`
        + `<div class="card-body">${metaHtml(card)}${card.groups.map(groupHtml).join('')}</div></section>`;
}

function panelHtml(panel, i) {
    let body;
    if (panel.note) {
        body = `<section class="card"><h2 class="card-title">${panel.tab}</h2><div class="card-body">`
            + `<textarea id="${panel.note}" class="sync-item txt left" placeholder=" " spellcheck="false" autocomplete="off"></textarea></div></section>`;
    } else {
        body = panel.cards.map(cardHtml).join('');
    }
    const next = PANELS[i + 1];
    const nextBtn = next ? `<button type="button" class="next-btn" data-go="${i + 1}">다음: ${next.tab} &#9654;</button>` : '';
    return `<div class="panel" data-panel="${i}" hidden>${body}${nextBtn}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('log-date');
    const dayDisplay = document.getElementById('log-day');
    const statusEl = document.getElementById('sync-status');
    const tabsEl = document.getElementById('tabs');
    const panelsEl = document.getElementById('panels');

    tabsEl.innerHTML = PANELS.map((p, i) => `<button type="button" class="tab" data-go="${i}">${p.tab}<small></small></button>`).join('');
    panelsEl.innerHTML = PANELS.map(panelHtml).join('');

    const tabEls = Array.from(tabsEl.querySelectorAll('.tab'));
    const panelEls = Array.from(panelsEl.querySelectorAll('.panel'));
    const syncItems = document.querySelectorAll('.sync-item');

    let currentRef = null;
    let online = false;
    let pending = 0;
    let saveFailed = false;

    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

    // ===== 구역 탭 전환 =====
    function showPanel(index) {
        panelEls.forEach((el, i) => { el.hidden = i !== index; });
        tabEls.forEach((el, i) => el.classList.toggle('on', i === index));
        window.scrollTo(0, 0);
    }

    document.addEventListener('click', e => {
        const go = e.target.closest('[data-go]');
        if (go) showPanel(Number(go.dataset.go));
    });

    // 탭별 측정값(전압/전류) 입력 현황: 입력한 칸 수 / 전체 칸 수
    function updateCounts() {
        panelEls.forEach((panel, i) => {
            const nums = Array.from(panel.querySelectorAll('.num'));
            if (!nums.length) return;
            const filled = nums.filter(el => el.value.trim() !== '').length;
            const badge = tabEls[i].querySelector('small');
            badge.textContent = `${filled}/${nums.length}`;
            badge.classList.toggle('done', filled === nums.length);
        });
    }

    // ===== 저장 상태 표시 =====
    function renderStatus() {
        let text = '저장됨';
        let cls = 'ok';
        if (saveFailed) { text = '저장 실패'; cls = 'off'; }
        else if (!online) { text = '오프라인'; cls = 'off'; }
        else if (pending > 0) { text = '저장 중'; cls = 'busy'; }
        statusEl.textContent = text;
        statusEl.className = 'status ' + cls;
    }

    db.ref('.info/connected').on('value', snapshot => {
        online = snapshot.val() === true;
        renderStatus();
    });

    // Date 객체를 YYYY-MM-DD 문자열로 변환
    function formatDate(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // null 및 undefined 안전 제거 함수
    function sanitizeValue(val) {
        if (val === null || val === undefined || val === 'null' || val === 'undefined') {
            return '';
        }
        return val;
    }

    // 날짜 및 요일 텍스트 업데이트
    function updateDayDisplay(dateStr) {
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj)) {
            dayDisplay.textContent = '(' + daysOfWeek[dateObj.getDay()] + ')';
        }
    }

    function setDate(dateStr) {
        dateInput.value = dateStr;
        loadLogData(dateStr);
        updateDayDisplay(dateStr);
    }

    // 날짜 변경 함수 (화살표 버튼용)
    window.changeDate = function(offsetDays) {
        const currentDate = new Date(dateInput.value);
        if (!isNaN(currentDate)) {
            currentDate.setDate(currentDate.getDate() + offsetDays);
            setDate(formatDate(currentDate));
        }
    };

    // 오늘 날짜 바로가기
    window.goToday = function() {
        setDate(formatDate(new Date()));
    };

    // 초기 오늘 날짜 표시 세팅 (데이터 로드는 인증 확인 후 진행)
    dateInput.value = formatDate(new Date());
    updateDayDisplay(dateInput.value);
    showPanel(0);
    updateCounts();

    // Firebase 실시간 데이터 로드
    function loadLogData(dateStr) {
        if (!dateStr) return;
        if (currentRef) currentRef.off();
        // 입력 중이던 칸의 값이 다른 날짜에 남지 않도록 포커스 해제
        if (document.activeElement && document.activeElement.classList.contains('sync-item')) {
            document.activeElement.blur();
        }
        // 노드 경로: substation_logs/YYYY-MM-DD (PC 화면과 동일)
        currentRef = db.ref('substation_logs/' + dateStr);

        currentRef.on('value', snapshot => {
            const data = snapshot.val() || {};
            syncItems.forEach(item => {
                if (document.activeElement !== item) {
                    item.value = sanitizeValue(data[item.id]);
                }
            });
            updateCounts();
        }, err => {
            console.error("데이터 로드 오류:", err);
        });
    }

    // 입력 즉시 저장
    panelsEl.addEventListener('input', e => {
        const el = e.target;
        if (!el.classList.contains('sync-item')) return;
        updateCounts();
        if (!currentRef) return;

        pending++;
        renderStatus();
        currentRef.child(el.id).set(el.value)
            .then(() => { saveFailed = false; })
            .catch(err => {
                saveFailed = true;
                console.error("저장 오류:", err);
            })
            .finally(() => {
                pending--;
                renderStatus();
            });
    });

    // '지금' 버튼: 현재 시각(HH:MM)을 시간 칸에 입력
    panelsEl.addEventListener('click', e => {
        const btn = e.target.closest('.now-btn');
        if (!btn) return;
        const now = new Date();
        const input = document.getElementById(btn.dataset.for);
        input.value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // 키패드의 '다음/이동(Enter)' 키: 다음 입력칸으로 이동
    panelsEl.addEventListener('keydown', e => {
        const el = e.target;
        if (e.key !== 'Enter' || el.tagName !== 'INPUT') return;
        if (e.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        const inputs = Array.from(el.closest('.panel').querySelectorAll('input.sync-item'));
        const next = inputs[inputs.indexOf(el) + 1];
        if (next) {
            next.focus();
            next.select();
        } else {
            el.blur();
        }
    });

    dateInput.addEventListener('change', e => {
        loadLogData(e.target.value);
        updateDayDisplay(e.target.value);
    });

    // 인증 상태 감지
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            loadLogData(dateInput.value);
        } else {
            if (currentRef) currentRef.off();
            currentRef = null;
            window.location.replace(new URL(LOGIN_PAGE_URL, window.location.href).href);
        }
    });
});
