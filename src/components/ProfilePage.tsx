"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/components/fetcher";
import { Button, Card, Input, Select, Field, Spinner, RoleBadge, PageHeader } from "@/components/ui";
import { useLang } from "@/lib/i18n";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  age: number | null;
  bio: string | null;
  avatarUrl: string | null;
  emergencyContact: string | null;
}

export function ProfilePage() {
  const { t } = useLang();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await api<{ user: UserProfile }>("/api/profile");
        setProfile(data.user);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSuccessMsg(null);
    setError(null);

    try {
      const updated = await api<{ user: UserProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          age: profile.age ? Number(profile.age) : null,
          bio: profile.bio,
          emergencyContact: profile.emergencyContact,
        }),
      });
      setProfile(updated.user);
      setSuccessMsg(t("profileUpdated"));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSuccessMsg(null);
    setError(null);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error ?? t("uploadFailed"));
      }
      setProfile((prev) => prev ? { ...prev, avatarUrl: data.data.url } : null);
      setSuccessMsg(t("profileUpdated"));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <Card className="mx-auto max-w-lg border-status-red/40 bg-status-red/5 p-6 text-center text-status-red">
        <p className="font-semibold">Error Loading Profile</p>
        <p className="mt-1 text-sm opacity-90">{error}</p>
      </Card>
    );
  }

  if (!profile) return null;

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("editProfile")} subtitle={profile.email} />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Avatar Panel */}
        <Card className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="group relative cursor-pointer" onClick={handleAvatarClick} role="button" tabIndex={0} aria-label={t("changePicture")}>
            <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-brand-accent/30 transition-all duration-300 group-hover:ring-brand-accent">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-brand-surface2 to-brand-border text-2xl font-bold tracking-wider text-brand-accent">
                  {initials}
                </div>
              )}

              {/* Upload Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                  {uploading ? t("uploading") : t("changePicture")}
                </span>
              </div>
            </div>
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Spinner className="h-6 w-6" />
              </span>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div>
            <h3 className="font-bold text-lg text-brand-foreground">{profile.name}</h3>
            <div className="mt-1.5">
              <RoleBadge role={profile.role as any} />
            </div>
          </div>
        </Card>

        {/* Right Side: Form Panel */}
        <Card className="md:col-span-2 p-6">
          <form onSubmit={handleSave} className="space-y-4">
            {successMsg && (
              <div className="animate-fade rounded-xl border border-status-green/30 bg-status-green/10 p-3 text-sm text-status-green font-medium">
                {successMsg}
              </div>
            )}
            {error && (
              <div className="animate-fade rounded-xl border border-status-red/30 bg-status-red/10 p-3 text-sm text-status-red font-medium">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("name")} required>
                <Input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </Field>

              <Field label={t("phone")}>
                <Input
                  type="tel"
                  placeholder="+251..."
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("age")}>
                <Input
                  type="number"
                  placeholder="25"
                  min={1}
                  max={120}
                  value={profile.age || ""}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>

              <Field label={t("emergencyContact")}>
                <Input
                  type="text"
                  placeholder="Name / Phone"
                  value={profile.emergencyContact || ""}
                  onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                />
              </Field>
            </div>

            <Field label={t("bio")}>
              <textarea
                className="w-full min-h-[96px] rounded-xl border border-brand-border bg-brand-surface2 px-3 py-2 text-sm text-brand-foreground outline-none transition-colors placeholder:text-brand-muted focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/40"
                placeholder="Tell us about yourself..."
                value={profile.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </Field>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>
                {t("saveChanges")}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
