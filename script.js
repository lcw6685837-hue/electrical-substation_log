// ===== 전체화면 토글 =====
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`전체화면 에러: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// ===== Firebase 및 데이터 연동 =====
// 로그인되지 않았을 때 이동할 로그인 페이지 경로 (이 페이지 기준 상대경로)
const LOGIN_PAGE_URL = "login.html";

const db = firebase.database();

// ===== 로그아웃 =====
function logout() {
    firebase.auth().signOut();
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('log-date');
    const dayDisplay = document.getElementById('log-day');
    const syncItems = document.querySelectorAll('.sync-item');

    let currentRef = null;
    let listenersAttached = false;

    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

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
            const dayName = daysOfWeek[dateObj.getDay()] + '요일';
            dayDisplay.textContent = dayName;
        }
    }

    // 날짜 변경 함수 (화살표 버튼용)
    window.changeDate = function(offsetDays) {
        const currentDate = new Date(dateInput.value);
        if (!isNaN(currentDate)) {
            currentDate.setDate(currentDate.getDate() + offsetDays);
            const newDateStr = formatDate(currentDate);

            dateInput.value = newDateStr;
            loadLogData(newDateStr);
            updateDayDisplay(newDateStr);
        }
    };

    // 오늘 날짜 바로가기
    window.goToday = function() {
        const todayStr = formatDate(new Date());

        dateInput.value = todayStr;
        loadLogData(todayStr);
        updateDayDisplay(todayStr);
    };

    // 초기 오늘 날짜 표시 세팅 (데이터 로드는 인증 확인 후 진행)
    dateInput.value = formatDate(new Date());
    updateDayDisplay(dateInput.value);

    // Firebase 실시간 데이터 로드
    function loadLogData(dateStr) {
        if (currentRef) currentRef.off();
        // 노드 경로: substation_logs/YYYY-MM-DD (작업일지 job_sheets와 분리)
        currentRef = db.ref('substation_logs/' + dateStr);
        
        currentRef.on('value', snapshot => {
            const data = snapshot.val() || {};
            syncItems.forEach(item => {
                if (document.activeElement !== item) {
                    item.value = sanitizeValue(data[item.id]);
                }
            });
        }, err => {
            console.error("데이터 로드 오류:", err);
        });
    }

    // 인증 상태 감지 및 이벤트 리스너 등록
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            if (!listenersAttached) {
                syncItems.forEach(item => {
                    item.addEventListener('input', e => {
                        if (currentRef) {
                            currentRef.child(e.target.id).set(e.target.value)
                                .catch(err => {
                                    console.error("저장 오류:", err);
                                });
                        }
                    });
                });

                dateInput.addEventListener('change', e => {
                    loadLogData(e.target.value);
                    updateDayDisplay(e.target.value);
                });

                listenersAttached = true;
            }

            loadLogData(dateInput.value);
            updateDayDisplay(dateInput.value);
        } else {
            // 로그인 페이지로 이동 (자기 자신이면 무한 새로고침이 되므로 이동하지 않음)
            const loginUrl = new URL(LOGIN_PAGE_URL, window.location.href);
            if (loginUrl.pathname !== window.location.pathname) {
                window.location.replace(loginUrl.href);
            } else {
                console.warn("로그인되지 않았습니다. script.js의 LOGIN_PAGE_URL에 로그인 페이지 경로를 지정하세요.");
            }
        }
    });

    // ===== 점검표 방향키 셀 이동 =====
    // 상/하: 바로 위/아래 칸으로 이동, 좌/우: 커서가 글자 맨 앞/맨 끝일 때만 옆 칸으로 이동
    const logTable = document.querySelector('.log-table');
    const navCells = Array.from(logTable.querySelectorAll('.sync-item'));

    function findNextCell(current, key) {
        const cur = current.getBoundingClientRect();
        const curCx = (cur.left + cur.right) / 2;
        let best = null;
        let bestScore = Infinity;

        navCells.forEach(cell => {
            if (cell === current) return;
            const r = cell.getBoundingClientRect();
            const cx = (r.left + r.right) / 2;
            const cy = (r.top + r.bottom) / 2;
            const sameRow = r.top < cur.bottom - 1 && r.bottom > cur.top + 1;
            const sameCol = r.left < cur.right - 1 && r.right > cur.left + 1;
            let score = Infinity;

            if (key === 'ArrowRight' && sameRow && cx > curCx) score = cx - curCx;
            if (key === 'ArrowLeft' && sameRow && cx < curCx) score = curCx - cx;
            // 위/아래: 같은 열에 걸친 칸 우선 → 가장 가까운 행 → 가로 위치가 가장 가까운 칸
            if (key === 'ArrowDown' && cy > cur.bottom - 1) score = (sameCol ? 0 : 1e9) + (r.top - cur.bottom) * 1000 + Math.abs(cx - curCx);
            if (key === 'ArrowUp' && cy < cur.top + 1) score = (sameCol ? 0 : 1e9) + (cur.top - r.bottom) * 1000 + Math.abs(cx - curCx);

            if (score < bestScore) {
                bestScore = score;
                best = cell;
            }
        });
        return best;
    }

    logTable.addEventListener('keydown', e => {
        const el = e.target;
        if (!el.classList || !el.classList.contains('sync-item')) return;
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        // Alt+←/→(날짜 이동) 등 조합키, 한글 입력 조합 중에는 무시
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey || e.isComposing || e.keyCode === 229) return;

        const value = el.value;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const noSelection = start === end;

        if (e.key === 'ArrowLeft' && !(noSelection && start === 0)) return;
        if (e.key === 'ArrowRight' && !(noSelection && end === value.length)) return;
        // 여러 줄 입력칸(특기사항)은 첫 줄/마지막 줄에서만 위/아래 칸으로 이동
        if (el.tagName === 'TEXTAREA') {
            if (e.key === 'ArrowUp' && value.lastIndexOf('\n', start - 1) !== -1) return;
            if (e.key === 'ArrowDown' && value.indexOf('\n', end) !== -1) return;
        }

        const next = findNextCell(el, e.key);
        if (!next) return;
        e.preventDefault();
        next.focus();
        const len = next.value.length;
        next.setSelectionRange(len, len);
    });

    // 단축키 (Alt + Left / Alt + Right) 날짜 이동 지원
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            changeDate(-1);
        } else if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            changeDate(1);
        }
    });
});
