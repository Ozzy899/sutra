"use client";

import { t } from "@/components/copy";
import { GmailIcon } from "@/components/share-channel-icons";
import { Button } from "@/components/ui/button";
import { emailDraft, listingEmails, mailtoHref } from "@/lib/onepager/email";
import {
  downloadBlob,
  gmailComposeUrl,
  mailtoComposeUrl,
  onePagerFilename,
  onePagerGmailBody,
  onePagerGmailSubject,
  shareOnePagerPdf,
} from "@/lib/onepager/share";
import type { JobListing, PitchPack, Profile, ProofOfWork, WeekPlan } from "@/lib/types";
import { Copy, Download, FileText, LoaderCircle, Mail, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  job: JobListing;
  profile: Profile;
  proof: ProofOfWork | null;
  pitch: PitchPack | null;
  plan: WeekPlan | null;
  ready: boolean;
  tour?: boolean;
  onGenerated?: (job: JobListing) => void;
};

type Busy = "open" | "save" | "share" | "copy" | "gmail" | null;

export function JobApplyActions({
  job,
  profile,
  ready,
  tour,
  onGenerated,
}: Props) {
  const [busy, setBusy] = useState<Busy>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [webShare, setWebShare] = useState(false);
  const knownEmail = listingEmails(job)[0];

  useEffect(() => {
    setWebShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const payload = () => ({
    job,
    profile,
  });

  const fetchPdf = async (): Promise<Blob | null> => {
    if (!ready) {
      setErr(t.onePagerNeedRun);
      return null;
    }
    setErr(null);
    const res = await fetch("/api/onepager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(json?.error || t.error);
    }
    const blob = await res.blob();
    onGenerated?.(job);
    return blob;
  };

  const openPdf = async () => {
    setBusy("open");
    setNote(null);
    try {
      const blob = await fetchPdf();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) downloadBlob(blob, onePagerFilename(profile, job));
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(null);
    }
  };

  const savePdfQuiet = async (): Promise<boolean> => {
    try {
      const blob = await fetchPdf();
      if (!blob) return false;
      downloadBlob(blob, onePagerFilename(profile, job));
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.error);
      return false;
    }
  };

  const onSave = async () => {
    setBusy("save");
    setNote(null);
    try {
      const saved = await savePdfQuiet();
      if (saved) setNote(t.onePagerSaved);
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    setBusy("share");
    setNote(null);
    try {
      const blob = await fetchPdf();
      if (!blob) return;
      const outcome = await shareOnePagerPdf(blob, profile, job);
      setNote(
        outcome === "shared"
          ? t.onePagerShared
          : outcome === "copied"
            ? t.onePagerCopiedShare
            : outcome === "copied-and-downloaded"
              ? t.onePagerCopiedAndSaved
              : t.onePagerSaved,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setNote(t.onePagerShareAbort);
        return;
      }
      setErr(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(null);
    }
  };

  const onGmail = async () => {
    if (!ready) {
      setErr(t.onePagerNeedRun);
      return;
    }
    setBusy("gmail");
    setNote(null);
    setErr(null);
    try {
      const saved = await savePdfQuiet();
      const subject = onePagerGmailSubject(profile, job);
      const body = onePagerGmailBody(profile, job);
      const gmail = gmailComposeUrl(subject, body);
      const mail = mailtoComposeUrl(subject, body);
      const w = window.open(gmail, "_blank", "noopener,noreferrer");
      if (!w) window.location.assign(mail);
      setNote(saved ? t.onePagerGmailNote : t.onePagerGmailNoteNoPdf);
    } finally {
      setBusy(null);
    }
  };

  const copyDraft = async () => {
    setBusy("copy");
    const draft = emailDraft(job, profile.name);
    const text = `To: ${draft.to || "(paste hiring email — none on this listing)"}\nSubject: ${draft.subject}\n\n${draft.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr(t.error);
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;

  return (
    <div className="mt-2 space-y-2" data-tour={tour ? "studio-onepager" : undefined}>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void openPdf()} disabled={disabled || !ready}>
          {busy === "open" ? <LoaderCircle className="animate-spin" /> : <FileText />}
          {busy === "open" ? t.onePagerBusy : t.onePager}
        </Button>
        {ready ? (
          <>
            <Button size="sm" variant="outline" onClick={() => void onSave()} disabled={disabled}>
              {busy === "save" ? <LoaderCircle className="animate-spin" /> : <Download />}
              {busy === "save" ? t.onePagerSaving : t.onePagerSave}
            </Button>
            {webShare ? (
              <Button size="sm" variant="outline" onClick={() => void onShare()} disabled={disabled}>
                {busy === "share" ? <LoaderCircle className="animate-spin" /> : <Share2 />}
                {busy === "share" ? t.onePagerSharing : t.onePagerShareDevice}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                window.location.href = mailtoHref(job, profile.name);
              }}
              disabled={disabled}
            >
              <Mail />
              {knownEmail ? t.onePagerEmail : t.onePagerMailto}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void copyDraft()} disabled={disabled}>
              <Copy />
              {copied ? t.onePagerCopied : t.onePagerCopy}
            </Button>
          </>
        ) : null}
      </div>
      {ready ? (
        <>
          <p className="text-xs font-medium text-foreground">{t.onePagerShareChannels}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void onGmail()} disabled={disabled} aria-label={t.onePagerGmail}>
              {busy === "gmail" ? <LoaderCircle className="animate-spin" /> : <GmailIcon />}
              {t.onePagerGmail}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{t.onePagerShareHint}</p>
        </>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">{t.onePagerNeedRun}</p>
      )}
      {knownEmail && ready ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{t.onePagerEmailHint}</p>
      ) : ready ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{t.onePagerNoEmail}</p>
      ) : null}
      {note ? (
        <p className="text-xs" role="status">
          {note}
        </p>
      ) : null}
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
    </div>
  );
}
