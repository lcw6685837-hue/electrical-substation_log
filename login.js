// ===== 로그인 페이지 로직 =====
const MAIN_PAGE_URL = "index.html";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorBox = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    function showError(message) {
        errorBox.textContent = message;
        errorBox.classList.remove('hidden');
    }

    function hideError() {
        errorBox.classList.add('hidden');
    }

    function mapAuthError(code) {
        switch (code) {
            case 'auth/invalid-email':
                return '이메일 형식이 올바르지 않습니다.';
            case 'auth/user-disabled':
                return '사용이 제한된 계정입니다. 관리자에게 문의하세요.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return '이메일 또는 비밀번호가 올바르지 않습니다.';
            case 'auth/too-many-requests':
                return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
            default:
                return '로그인에 실패했습니다. 다시 시도해주세요.';
        }
    }

    // 이미 로그인되어 있으면 바로 메인 페이지로 이동
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            window.location.replace(MAIN_PAGE_URL);
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        hideError();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '로그인 중...';

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(() => {
                window.location.replace(MAIN_PAGE_URL);
            })
            .catch(err => {
                console.error('로그인 오류:', err);
                showError(mapAuthError(err.code));
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = '로그인';
            });
    });
});
