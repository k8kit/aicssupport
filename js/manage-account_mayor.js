document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("manageAccountForm");
    const editBtn = document.getElementById("editBtn");
    const saveBtn = document.getElementById("saveBtn");
    const togglePassword = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");

    const inputs = form.querySelectorAll("input");

    // Disable all editable inputs initially
    inputs.forEach(input => {
        if (input.id !== "role" && input.id !== "department") {
            input.disabled = true;
        }
    });
    togglePassword.disabled = true;

    // Fetch user info
    try {
        const response = await fetch("../api/admin/get-admin-info.php");
        const result = await response.json();

        if (result.success) {
            const data = result.data;
            document.getElementById("username").value = data.username || "";
            document.getElementById("full_name").value = data.full_name || "";
            document.getElementById("email").value = data.email || "";
            document.getElementById("department").value = data.department || "";
            document.getElementById("license_number").value = data.license_number || "";
            if (data.e_signature) {
                document.getElementById("current-signature").innerHTML = `
                    <small class="text-muted">Current signature:</small><br>
                    <img src="../${data.e_signature}" alt="E-Signature" class="img-fluid border rounded mt-1" style="max-height:100px;">
                `;
            }
        }
    } catch (err) {
        console.error("Error loading user info:", err);
    }

    // Edit button logic
    editBtn.addEventListener("click", () => {
        inputs.forEach(input => {
            if (input.id !== "role" && input.id !== "department") {
                input.disabled = false;
            }
        });
        togglePassword.disabled = false;
        editBtn.classList.add("d-none");
        saveBtn.classList.remove("d-none");
    });

    // Save form submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        const response = await fetch("../api/admin/update-admin-info.php", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            alert("Account information updated successfully!");
            // Re-disable inputs after saving
            location.reload();
            inputs.forEach(input => {
                if (input.id !== "role" && input.id !== "department") {
                    input.disabled = true;
                }
            });
            togglePassword.disabled = true;
            saveBtn.classList.add("d-none");
            editBtn.classList.remove("d-none");
        } else {
            alert("Failed to update account: " + result.message);
        }
    });

    // Password show/hide toggle
    togglePassword.addEventListener("click", () => {
        if (togglePassword.disabled) return; // Prevent toggle if disabled

        const isHidden = passwordInput.type === "password";
        passwordInput.type = isHidden ? "text" : "password";
        togglePassword.innerHTML = `<i class="bi ${isHidden ? "bi-eye-slash" : "bi-eye"}"></i>`;
    });
});
