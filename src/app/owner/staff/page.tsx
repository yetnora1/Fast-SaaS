"use client";
import { useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Select, RoleBadge, PageHeader, Field, Spinner, Modal } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import type { Role } from "@prisma/client";

interface Staff {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  phone: string | null;
  age: number | null;
  bio: string | null;
  avatarUrl: string | null;
  emergencyContact: string | null;
  branch: { id: string; name: string } | null;
}

interface Branch {
  id: string;
  name: string;
}

const ROLES = ["cafe_manager", "waiter", "cashier", "barista", "kitchen", "store_manager"] as const;

export default function StaffPage() {
  const { t } = useLang();

  // Poll staff list
  const { data: staffData, reload: reloadStaff, loading: loadingStaff } = usePoll<{ staff: Staff[] }>("/api/owner/staff", 0);
  // Poll branches
  const { data: branchData } = usePoll<{ branches: Branch[] }>("/api/owner/branches", 0);

  const [invite, setInvite] = useState({ email: "", role: "waiter" });
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Edit form states
  const [editRole, setEditRole] = useState<Role>("waiter");
  const [editBranchId, setEditBranchId] = useState<string>("unassigned");
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function sendInvite() {
    setInviteMsg(null);
    setInviteLoading(true);
    try {
      const res = await api<{ link: string }>("/api/owner/staff/invite", {
        method: "POST",
        body: JSON.stringify(invite),
      });
      setInviteMsg(`${t("sendInvite")}! Link: ${res.link}`);
      setInvite({ email: "", role: "waiter" });
      reloadStaff();
    } catch (e) {
      setInviteMsg((e as Error).message);
    } finally {
      setInviteLoading(false);
    }
  }

  function openEditModal(staff: Staff) {
    setSelectedStaff(staff);
    setEditRole(staff.role);
    setEditBranchId(staff.branch?.id ?? "unassigned");
    setEditActive(staff.active);
    setEditError(null);
    setIsEditModalOpen(true);
  }

  function openProfileModal(staff: Staff) {
    setSelectedStaff(staff);
    setIsProfileModalOpen(true);
  }

  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStaff) return;
    setEditLoading(true);
    setEditError(null);

    try {
      await api(`/api/owner/staff/${selectedStaff.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          role: editRole,
          branchId: editBranchId === "unassigned" ? null : editBranchId,
          active: editActive,
        }),
      });
      setIsEditModalOpen(false);
      reloadStaff();
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  }

  async function quickToggleStatus(staff: Staff) {
    try {
      await api(`/api/owner/staff/${staff.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({
          active: !staff.active,
        }),
      });
      reloadStaff();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  // Filter staff based on controls
  const filteredStaff = staffData?.staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.active) ||
      (statusFilter === "inactive" && !s.active);
    return matchesSearch && matchesRole && matchesStatus;
  }) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("staffManagement")}
        subtitle={`${filteredStaff.length} ${t("staffWord")} ${t("active").toLowerCase()}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Invite & Filters */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="space-y-4">
            <h2 className="font-display text-lg font-bold text-brand-foreground">{t("inviteStaff")}</h2>
            <div className="space-y-3">
              <Field label={t("email")} required>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                />
              </Field>

              <Field label={t("role")} required>
                <Select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Field>

              <Button onClick={sendInvite} disabled={!invite.email} loading={inviteLoading} className="w-full">
                {t("sendInvite")}
              </Button>
            </div>
            {inviteMsg && (
              <p className="break-all rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-3 text-xs text-brand-accent">
                {inviteMsg}
              </p>
            )}
          </Card>

          <Card className="space-y-4">
            <h2 className="font-display text-lg font-bold text-brand-foreground">Filters</h2>
            <div className="space-y-3">
              <Field label="Search">
                <Input
                  placeholder={t("searchStaff")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Field>

              <Field label={t("filterByRole")}>
                <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="all">{t("allRoles")}</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Status">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="active">{t("active")}</option>
                  <option value="inactive">{t("inactive")}</option>
                </Select>
              </Field>
            </div>
          </Card>
        </div>

        {/* Right: Staff Cards Grid */}
        <div className="lg:col-span-2">
          {loadingStaff ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center text-brand-muted">
              <svg className="h-12 w-12 opacity-40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>{t("noStaffFound")}</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredStaff.map((s) => {
                const initials = s.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2);

                return (
                  <Card key={s.id} className="flex flex-col justify-between p-5 space-y-4 hover:border-brand-accent/40 transition-colors duration-200">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-brand-border">
                        {s.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.avatarUrl} alt={s.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-brand-surface2 to-brand-border font-bold text-brand-accent">
                            {initials}
                          </div>
                        )}
                      </div>

                      {/* Header Details */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="font-bold text-brand-foreground truncate">{s.name}</h3>
                        <p className="text-xs text-brand-muted truncate">{s.email}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <RoleBadge role={s.role} />
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            s.active ? "bg-status-green/10 text-status-green" : "bg-status-red/10 text-status-red"
                          }`}>
                            {s.active ? t("active") : t("inactive")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-brand-border/60 pt-3 space-y-2 text-xs text-brand-muted">
                      <div>
                        <span className="font-medium text-brand-foreground">{t("branch")}:</span>{" "}
                        {s.branch?.name ?? <span className="italic">{t("unassigned")}</span>}
                      </div>
                      {s.phone && (
                        <div>
                          <span className="font-medium text-brand-foreground">{t("phone")}:</span> {s.phone}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 border-t border-brand-border/60 pt-3">
                      <Button variant="ghost" size="sm" onClick={() => openProfileModal(s)}>
                        {t("profile")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(s)}>
                        Edit
                      </Button>
                      <Button
                        variant={s.active ? "danger" : "primary"}
                        size="sm"
                        onClick={() => quickToggleStatus(s)}
                      >
                        {s.active ? t("deactivate") : t("activate")}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Edit Role / Branch / Status */}
      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Staff Member">
        <form onSubmit={handleUpdateStaff} className="space-y-4 pt-2">
          {editError && <div className="text-xs text-status-red bg-status-red/10 p-2.5 rounded-xl">{editError}</div>}

          <Field label={t("role")}>
            <Select value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("branch")}>
            <Select value={editBranchId} onChange={(e) => setEditBranchId(e.target.value)}>
              <option value="unassigned">{t("unassigned")}</option>
              {branchData?.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-center justify-between py-2 border-t border-brand-border/60">
            <span className="text-sm font-medium text-brand-foreground">Account Status</span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-brand-surface2 border border-brand-border after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-brand-muted after:transition-all peer-checked:bg-brand-accent peer-checked:after:translate-x-full peer-checked:after:bg-brand-accentFg"></div>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-brand-border/60 pt-4">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={editLoading}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Full Profile View */}
      <Modal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title={selectedStaff?.name || t("profile")}>
        {selectedStaff && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col items-center text-center space-y-2 pb-2">
              <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-brand-border">
                {selectedStaff.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedStaff.avatarUrl} alt={selectedStaff.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-brand-surface2 to-brand-border text-lg font-bold text-brand-accent">
                    {selectedStaff.name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-brand-foreground">{selectedStaff.name}</h3>
              <RoleBadge role={selectedStaff.role} />
            </div>

            <div className="divide-y divide-brand-border/40 text-sm">
              <div className="py-2 flex justify-between">
                <span className="text-brand-muted">{t("email")}</span>
                <span className="text-brand-foreground font-medium">{selectedStaff.email}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-brand-muted">{t("phone")}</span>
                <span className="text-brand-foreground font-medium">{selectedStaff.phone || "—"}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-brand-muted">{t("age")}</span>
                <span className="text-brand-foreground font-medium">{selectedStaff.age || "—"}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-brand-muted">{t("emergencyContact")}</span>
                <span className="text-brand-foreground font-medium">{selectedStaff.emergencyContact || "—"}</span>
              </div>
              <div className="py-2.5">
                <div className="text-brand-muted mb-1">{t("bio")}</div>
                <p className="text-brand-foreground italic bg-brand-surface2 p-3 rounded-xl min-h-[60px] text-xs">
                  {selectedStaff.bio || "No biography provided."}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-brand-border/60">
              <Button onClick={() => setIsProfileModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
