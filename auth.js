const tabs = document.querySelectorAll("[data-auth-tab]");
const loginForm = document.querySelector("[data-login-form]");
const registerForm = document.querySelector("[data-register-form]");

function setTab(name) {
  tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.authTab === name));
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
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "request_failed");
  return result;
}

function errorLabel(error) {
  const labels = {
    invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    too_many_login_attempts: "محاولات كثيرة. حاول مرة أخرى بعد 15 دقيقة.",
    weak_password: "استخدم 12 خانة على الأقل مع حرف كبير وصغير ورقم ورمز.",
    email_already_registered: "هذا البريد مسجل مسبقاً.",
    privacy_consent_required: "الموافقة على معالجة بيانات الحساب مطلوبة.",
    missing_registration_fields: "أكمل جميع الحقول المطلوبة."
  };
  return labels[error.message] || "تعذر إكمال الطلب الآن.";
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = loginForm.querySelector("button[type='submit']");
  const status = document.querySelector("[data-login-status]");
  button.disabled = true;
  statusMessage(status, "جاري التحقق...");
  try {
    const result = await authRequest("/api/auth/login", Object.fromEntries(new FormData(loginForm).entries()));
    location.href = result.user.role === "platform_owner" ? "/owner" : "/app.html";
  } catch (error) {
    statusMessage(status, errorLabel(error));
  } finally {
    button.disabled = false;
  }
});

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
