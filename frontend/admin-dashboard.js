let posts = [];

function token() { return localStorage.getItem("barangay_token"); }

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  headers.Authorization = `Bearer ${token()}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function esc(v) {
  return String(v).replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[ch]));
}

function ago(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return new Date(date).toLocaleDateString();
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

function showMessage(id, msg, error = true) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `form-message ${error ? "error" : "success"}`;
}

function render(list = posts) {
  const box = document.getElementById("adminPostList");
  document.getElementById("adminLoading").style.display = "none";

  if (!list.length) {
    box.innerHTML = `<div class="empty"><div class="empty-icon">◎</div><h3>No posts</h3><p>There are no matching posts.</p></div>`;
    return;
  }

  box.innerHTML = list.map(p => `
    <article class="admin-row">
      <div class="admin-row-main">
        <div class="admin-post-top">
          <strong>${esc(p.authorName)}</strong>
          <span>${ago(p.createdAt)}</span>
        </div>
        <p>${esc(p.content).replace(/\n/g,"<br>")}</p>
        <div class="admin-row-meta">${p.comments.length} comment${p.comments.length === 1 ? "" : "s"}</div>
        <div class="admin-comments">
          ${p.comments.map(c => `
            <div class="admin-comment">
              <span><strong>${esc(c.authorName)}</strong>: ${esc(c.content)}</span>
              <button data-comment="${c._id}">Delete</button>
            </div>`).join("")}
        </div>
      </div>
      <div class="row-actions">
        <button class="secondary-btn" data-edit="${p._id}">Edit</button>
        <button class="danger-btn" data-delete="${p._id}">Delete</button>
      </div>
    </article>`).join("");

  box.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const p = posts.find(x => x._id === b.dataset.edit);
    document.getElementById("editPostId").value = p._id;
    document.getElementById("adminPostContent").value = p.content;
    document.getElementById("postModalTitle").textContent = "Edit post";
    document.getElementById("adminPostSubmit").textContent = "Save changes";
    document.getElementById("postModal").classList.remove("hidden");
  });

  box.querySelectorAll("[data-delete]").forEach(b => b.onclick = async () => {
    if (!confirm("Delete this post and all of its comments?")) return;
    try {
      await api(`/api/posts/${b.dataset.delete}`, { method: "DELETE" });
      toast("Post deleted.");
      load();
    } catch (e) { toast(e.message); }
  });

  box.querySelectorAll("[data-comment]").forEach(b => b.onclick = async () => {
    if (!confirm("Delete this comment?")) return;
    try {
      await api(`/api/comments/${b.dataset.comment}`, { method: "DELETE" });
      toast("Comment deleted.");
      load();
    } catch (e) { toast(e.message); }
  });

  document.getElementById("statPosts").textContent = posts.length;
  document.getElementById("statComments").textContent = posts.reduce((n,p) => n + p.comments.length, 0);
  document.getElementById("statAdminPosts").textContent = posts.filter(p => p.authorName.includes("(Admin)")).length;
}

async function load(search = "") {
  try {
    posts = await api(`/api/posts?search=${encodeURIComponent(search)}`);
    render(posts);
  } catch (e) {
    document.getElementById("adminLoading").textContent = e.message;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!token() || localStorage.getItem("barangay_role") !== "admin") {
    location.href = "admin.html";
    return;
  }

  try {
    const me = await api("/api/auth/me");
    if (me.role !== "admin") throw new Error();
    document.getElementById("adminName").textContent = me.account.username;
    document.getElementById("adminSideName").textContent = me.account.username;
  } catch {
    localStorage.clear();
    location.href = "admin.html";
    return;
  }

  load();

  document.getElementById("adminLogout").onclick = () => {
    localStorage.clear();
    location.href = "admin.html";
  };

  let timer;
  document.getElementById("adminSearch").oninput = e => {
    clearTimeout(timer);
    timer = setTimeout(() => load(e.target.value), 300);
  };

  document.getElementById("newPostBtn").onclick = () => {
    document.getElementById("editPostId").value = "";
    document.getElementById("adminPostContent").value = "";
    document.getElementById("postModalTitle").textContent = "Create post";
    document.getElementById("adminPostSubmit").textContent = "Publish";
    document.getElementById("postModal").classList.remove("hidden");
  };

  document.querySelectorAll("[data-close]").forEach(b => {
    b.onclick = () => document.getElementById(b.dataset.close).classList.add("hidden");
  });

  document.getElementById("adminPostForm").onsubmit = async e => {
    e.preventDefault();
    const id = document.getElementById("editPostId").value;
    const content = document.getElementById("adminPostContent").value.trim();
    if (!content) return;

    try {
      if (id) {
        await api(`/api/posts/${id}`, { method: "PUT", body: JSON.stringify({ content }) });
        toast("Post updated.");
      } else {
        await api("/api/posts", { method: "POST", body: JSON.stringify({ content }) });
        toast("Post published.");
      }
      document.getElementById("postModal").classList.add("hidden");
      load();
    } catch (err) {
      showMessage("adminPostMessage", err.message);
    }
  };

  document.getElementById("adminPasswordBtn").onclick = () => document.getElementById("passwordModal").classList.remove("hidden");

  document.getElementById("adminPasswordForm").onsubmit = async e => {
    e.preventDefault();
    if (adminNewPassword.value !== adminConfirmPassword.value) {
      showMessage("adminPasswordMessage", "New passwords do not match.");
      return;
    }
    try {
      await api("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: adminCurrentPassword.value,
          newPassword: adminNewPassword.value
        })
      });
      showMessage("adminPasswordMessage", "Password changed successfully.", false);
      e.target.reset();
    } catch (err) {
      showMessage("adminPasswordMessage", err.message);
    }
  };
});
