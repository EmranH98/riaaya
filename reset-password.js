const resetForm = document.querySelector("[data-reset-form]");
const expiredBanner = document.getElementById("reset-expired-banner");
const successBanner = document.getElementById("reset-success");

const params = new URLSearchParams(location.search);
const token = params.get("token");

if (!token) {
  expiredBanner.hidden = false;
  resetForm.hidden = true;
}

function statusMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

function errorLabel(error) {
  const labels = {
    token_and_password_required: "أدخل كلمة مرور جديدة.",
    weak_password: "استخدم 12 خانة على الأقل مع حرف كبير وصغير ورقم ورمز.",
    invalid_or_expired_token: "انتهت صلاحية الرابط أو أنه غير صحيح.",
    user_not_found: "لم نجد حسابك. تحقق من البريد وحاول مرة أخرى.",
    server_error: "حدث خطأ في الخادم. حاول مرة أخرى بعد لحظات."
  };
  return labels[error.message] || "تعذر إكمال الطلب الآن.";
}

if (resetForm) {
  resetForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = resetForm.querySelector("button[type='submit']");
    const status = document.querySelector("[data-reset-status]");
    button.disabled = true;
    statusMessage(status, "جاري حفظ كلمة المرور الجديدة...");
    try {
      const password = resetForm.querySelector("input[name='password']").value;
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "request_failed");
      resetForm.hidden = true;
      successBanner.hidden = false;
    } catch (error) {
      statusMessage(status, errorLabel(error));
    } finally {
      button.disabled = false;
    }
  });
}
