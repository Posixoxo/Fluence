// greeting.js - FINAL FIXED VERSION
// Works both as module AND regular script

function updateDynamicGreeting(user) {
    const greetingElement = document.getElementById('dynamic-greeting');
    if (!greetingElement) return; // Safety check

    const hour = new Date().getHours();
    let greetingBase = "";

    // Determine time of day
    if (hour >= 5 && hour < 12) greetingBase = "Good morning";
    else if (hour >= 12 && hour < 18) greetingBase = "Good afternoon";
    else if (hour >= 18 && hour < 22) greetingBase = "Good evening";
    else greetingBase = "Good night";

    // Determine Name
    // Using the same logic as your auth.js: displayName or email prefix
    const name = user 
        ? (user.displayName || user.email.split('@')[0]) 
        : "Guest";

    greetingElement.textContent = `${greetingBase}, ${name}`;
}

// ✅ Make it available globally (for regular script loading)
window.updateDynamicGreeting = updateDynamicGreeting;

// ✅ Export for module imports (for auth.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { updateDynamicGreeting };
}

// Auto-update on page load with "Guest"
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateDynamicGreeting(null);
    });
} else {
    updateDynamicGreeting(null);
}