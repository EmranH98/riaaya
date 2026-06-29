const tabs = document.querySelectorAll("[data-auth-tab]");
const loginForm = document.querySelector("[data-login-form]");
const registerForm = document.querySelector("[data-register-form]");
const forgotForm = document.querySelector("[data-forgot-form]");
const twoFactorForm = document.querySelector("[data-twofactor-form]");

function setTab(name) {
  tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.authTab === name));
  twoFactorForm.hidden = true;
  twoFactorForm.classList.remove("active");
  loginForm.hidden = false;
  registerForm.hidden = false;
  if (forgotForm) forgotForm.hidden = false;
  loginForm.classList.toggle("active", name === "login");
  registerForm.classList.toggle("active", name === "register");
  if (forgotForm) forgotForm.classList.toggle("active", name === "forgot");
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

async function retryAuth(path, payload, attempt) {
  // Render's free tier spins the service down when idle; the first request after
  // a nap can be refused/time-out while it wakes. Show a clear note and retry.
  document.querySelectorAll("[data-login-status],[data-register-status],[data-forgot-status]")
    .forEach(el => { if (el) statusMessage(el, "الخادم يستيقظ من وضع الخمول… جارٍ المحاولة تلقائياً."); });
  await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
  return authRequest(path, payload, attempt + 1);
}

async function authRequest(path, payload, attempt = 0) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    // Network failure — almost always the server cold-starting. Retry up to 4 times.
    if (attempt < 4) return retryAuth(path, payload, attempt);
    throw new Error("server_waking");
  }
  // Gateway codes mean the app is still starting behind the proxy — retry too.
  if ([502, 503, 504].includes(response.status) && attempt < 4) {
    return retryAuth(path, payload, attempt);
  }
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
    email_required: "أدخل بريدك الإلكتروني.",
    server_error: "حدث خطأ في الخادم. حاول مرة أخرى بعد لحظات.",
    server_waking: "تعذّر الوصول إلى الخادم — قد يكون في وضع الخمول بعد فترة سكون. انتظر 30 ثانية ثم حاول مرة أخرى."
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

if (forgotForm) {
  forgotForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = forgotForm.querySelector("button[type='submit']");
    const status = document.querySelector("[data-forgot-status]");
    button.disabled = true;
    statusMessage(status, "جاري إرسال الرابط...");
    try {
      const data = Object.fromEntries(new FormData(forgotForm).entries());
      await authRequest("/api/auth/forgot-password", data);
      statusMessage(status, "تحقق من بريدك الإلكتروني — الرابط صالح لمدة ساعة واحدة.", true);
      forgotForm.reset();
    } catch (error) {
      statusMessage(status, errorLabel(error));
    } finally {
      button.disabled = false;
    }
  });
  forgotForm.querySelector("[data-forgot-cancel]")?.addEventListener("click", () => setTab("login"));
}

fetch("/api/auth/session")
  .then(response => response.json())
  .then(result => {
    if (!result.authenticated || expiredTrial) return;
    location.href = result.user.role === "platform_owner" ? "/owner" : "/app.html";
  })
  .catch(() => {});
