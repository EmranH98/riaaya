const tabs = document.querySelectorAll("[data-auth-tab]");
const loginForm = document.querySelector("[data-login-form]");
const registerForm = document.querySelector("[data-register-form]");
const twoFactorForm = document.querySelector("[data-twofactor-form]");

function setTab(name) {
  tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.authTab === name));
  twoFactorForm.hidden = true;
  twoFactorForm.classList.remove("active");
  loginForm.hidden = false;
  registerForm.hidden = false;
  loginForm.classList.toggle("active", name === "login");
  registerForm.classList.toggle("active", name === "register");
}

tabs.forEach(tab => tab.addEventListener("click", () => setTab(tab.dataset.authTab)));
if (location.pathname === "/register" || location.pathname === "/register.html" || location.hash === "#register") setTab("register");
const expiredTrial = new URLSearchParams(location.search).get("expired") === "1";
if (expiredTrial) {
  document.querySelector("[data-login-status]").textContent = "انتهت الفترة التجريبية لهذه العيادة. تواصل مع إدارة رعاية لتفعيل الاشتراك.";
}

function statusMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

async function authRequest(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let result = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { error: response.ok ? "" : "server_error" };
  }
  if (!response.ok) throw new Error(result.error || "request_failed");
  return result;
}

function errorLabel(error) {
  const labels = {
    invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    too_many_login_attempts: "محاولات كثيرة. حاول مرة أخرى بعد 15 دقيقة.",
    weak_password: "استخدم 12 خانة على الأقل مع حرف كبير وصغير ورقم ورمز.",
    invalid_email: "أدخل بريدًا إلكترونيًا صحيحًا.",
    email_already_registered: "هذا البريد مسجل مسبقاً.",
    privacy_consent_required: "الموافقة على معالجة بيانات الحساب مطلوبة.",
    missing_registration_fields: "أكمل جميع الحقول المطلوبة.",
    invalid_2fa_code: "الرمز غير صحيح. حاول مرة أخرى.",
    challenge_expired: "انتهت مهلة التحقق. سجّل الدخول من جديد.",
    too_many_2fa_attempts: "محاولات كثيرة. سجّل الدخول من جديد.",
    invalid_challenge: "جلسة التحقق غير صالحة. سجّل الدخول من جديد.",
    invalid_2fa_setup: "إعداد المصادقة الثنائية يحتاج إعادة ضبط. استخدم رمز احتياط أو تواصل مع مدير النظام.",
    server_error: "حدث خطأ في الخادم. حاول مرة أخرى بعد لحظات."
  };
  return labels[error.message] || "تعذر إكمال الطلب الآن.";
}

let pendingChallengeId = "";

function showTwoFactorStep() {
  loginForm.hidden = true;
  registerForm.hidden = true;
  loginForm.classList.remove("active");
  registerForm.classList.remove("active");
  twoFactorForm.hidden = false;
  twoFactorForm.classList.add("active");
  twoFactorForm.querySelector("input[name='code']").focus();
}

function showLoginStep() {
  pendingChallengeId = "";
  twoFactorForm.hidden = true;
  twoFactorForm.classList.remove("active");
  loginForm.hidden = false;
  registerForm.hidden = false;
  setTab("login");
  twoFactorForm.reset();
}

function routeAfterLogin(user) {
  location.href = user.role === "platform_owner" ? "/owner" : "/app.html";
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = loginForm.querySelector("button[type='submit']");
  const status = document.querySelector("[data-login-status]");
  button.disabled = true;
  statusMessage(status, "جاري التحقق...");
  try {
    const result = await authRequest("/api/auth/login", Object.fromEntries(new FormData(loginForm).entries()));
    if (result.twoFactorRequired) {
      pendingChallengeId = result.challengeId;
      statusMessage(status, "");
      showTwoFactorStep();
      return;
    }
    routeAfterLogin(result.user);
  } catch (error) {
    statusMessage(status, errorLabel(error));
  } finally {
    button.disabled = false;
  }
});

if (twoFactorForm) {
  twoFactorForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = twoFactorForm.querySelector("button[type='submit']");
    const status = document.querySelector("[data-twofactor-status]");
    button.disabled = true;
    statusMessage(status, "جاري التحقق...");
    try {
      const code = twoFactorForm.querySelector("input[name='code']").value.trim();
      const result = await authRequest("/api/auth/2fa/verify", { challengeId: pendingChallengeId, code });
      routeAfterLogin(result.user);
    } catch (error) {
      statusMessage(status, errorLabel(error));
      if (["challenge_expired", "too_many_2fa_attempts"].includes(error.message)) {
        setTimeout(showLoginStep, 1500);
      }
    } finally {
      button.disabled = false;
    }
  });
  twoFactorForm.querySelector("[data-twofactor-cancel]")?.addEventListener("click", showLoginStep);
}

registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = registerForm.querySelector("button[type='submit']");
  const status = document.querySelector("[data-register-status]");
  const data = Object.fromEntries(new FormData(registerForm).entries());
  data.acceptedPrivacy = data.acceptedPrivacy === "on";
  button.disabled = true;
  statusMessage(status, "جاري إنشاء مساحة العيادة الآمنة...");
  try {
    await authRequest("/api/auth/register", data);
    statusMessage(status, "تم إنشاء الحساب. سيتم فتح عيادتك الآن.", true);
    location.href = "/app.html";
  } catch (error) {
    statusMessage(status, errorLabel(error));
  } finally {
    button.disabled = false;
  }
});

fetch("/api/auth/session")
  .then(response => response.json())
  .then(result => {
    if (!result.authenticated || expiredTrial) return;
    location.href = result.user.role === "platform_owner" ? "/owner" : "/app.html";
  })
  .catch(() => {});
