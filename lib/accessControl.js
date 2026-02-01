/**
 * Access Control - Telegram Bot Allowlist Management
 * Hybrid approach: Admin IDs in .env + dynamic allowlist in config file
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const ALLOWLIST_FILE = resolve(process.cwd(), "config", "allowlist.json");

/**
 * Get admin user IDs from environment
 */
export function getAdminIds() {
  const adminEnv = process.env.TELEGRAM_ADMIN_IDS || "6217316860";
  return adminEnv.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
}

/**
 * Check if user is an admin
 */
export function isAdmin(userId) {
  const adminIds = getAdminIds();
  return adminIds.includes(userId);
}

/**
 * Load allowlist from file
 */
export async function loadAllowlist() {
  try {
    const data = await readFile(ALLOWLIST_FILE, "utf-8");
    const allowlist = JSON.parse(data);
    return allowlist.users || [];
  } catch (error) {
    // File doesn't exist yet - return empty list
    if (error.code === "ENOENT") {
      return [];
    }
    console.error("[AccessControl] Error loading allowlist:", error.message);
    return [];
  }
}

/**
 * Save allowlist to file
 */
export async function saveAllowlist(users) {
  try {
    // Ensure config directory exists
    await mkdir(resolve(process.cwd(), "config"), { recursive: true });
    
    const allowlist = {
      updatedAt: new Date().toISOString(),
      users: users
    };
    
    await writeFile(ALLOWLIST_FILE, JSON.stringify(allowlist, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("[AccessControl] Error saving allowlist:", error.message);
    return false;
  }
}

/**
 * Check if user has access (admin or in allowlist)
 */
export async function hasAccess(userId) {
  // Admins always have access
  if (isAdmin(userId)) {
    return true;
  }
  
  // Check allowlist
  const allowlist = await loadAllowlist();
  return allowlist.some(user => user.id === userId);
}

/**
 * Add user to allowlist
 */
export async function addUser(userId, addedBy, metadata = {}) {
  const allowlist = await loadAllowlist();
  
  // Check if already exists
  if (allowlist.some(user => user.id === userId)) {
    return { success: false, reason: "already_exists" };
  }
  
  // Add new user
  const newUser = {
    id: userId,
    addedAt: new Date().toISOString(),
    addedBy: addedBy,
    name: metadata.name || null,
    role: metadata.role || "user"
  };
  
  allowlist.push(newUser);
  const saved = await saveAllowlist(allowlist);
  
  return { success: saved, user: newUser };
}

/**
 * Remove user from allowlist
 */
export async function removeUser(userId) {
  const allowlist = await loadAllowlist();
  const filtered = allowlist.filter(user => user.id !== userId);
  
  if (filtered.length === allowlist.length) {
    return { success: false, reason: "not_found" };
  }
  
  const saved = await saveAllowlist(filtered);
  return { success: saved };
}

/**
 * Get all allowed users
 */
export async function listAllowedUsers() {
  const allowlist = await loadAllowlist();
  const adminIds = getAdminIds();
  
  // Combine admins and allowlist
  const admins = adminIds.map(id => ({
    id,
    role: "admin",
    addedAt: "system",
    source: "environment"
  }));
  
  return {
    admins,
    users: allowlist,
    total: admins.length + allowlist.length
  };
}

/**
 * Get access denial message
 */
export function getAccessDeniedMessage() {
  return `🔒 <b>Private Beta Access</b>

This bot is currently in private beta testing.

To request access, please contact:
👤 @codenlighten (Gregory Ward)
🏢 SmartLedger Technology

Thank you for your interest in Lumen! 🚀`;
}

export default {
  getAdminIds,
  isAdmin,
  hasAccess,
  addUser,
  removeUser,
  listAllowedUsers,
  getAccessDeniedMessage
};
