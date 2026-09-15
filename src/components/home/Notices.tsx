"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Download, HardDriveDownload, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { backupStatus, BACKUP_NUDGE_DAYS, markBackedUp, snoozeBackupNudge } from "@/lib/backup";
import { isSupabaseConfigured } from "@/lib/config";
import { todayISO } from "@/lib/date";
import { download, toJSONBackup } from "@/lib/export";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Button } from "@/components/ui/Button";

const NAMES_DISMISS_KEY = "owp:namesNudgeDismissed";

/**
 * 홈 상단의 조용한 안내. 지금 챙기면 좋은 것만 최대 두 줄.
 * - 로컬 저장 모드에서 백업이 오래됐을 때
 * - 신랑·신부 이름이 비어 있을 때
 */
export function Notices() {
  const data = useWeddingStore((s) => s.data!);
  const wedding = data.wedding;
  const [backup, setBackup] = useState<{ show: boolean; days: number | null }>({ show: false, days: null });
  const [namesDismissed, setNamesDismissed] = useState(true);

  const refresh = useCallback(() => {
    if (!isSupabaseConfigured) {
      const st = backupStatus();
      setBackup({ show: st.shouldNudge, days: st.daysSinceBackup });
    }
    try {
      setNamesDismissed(localStorage.getItem(NAMES_DISMISS_KEY) === "1");
    } catch {
      setNamesDismissed(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const backupNow = () => {
    download(`our-wedding-backup-${todayISO()}.json`, toJSONBackup(data), "application/json;charset=utf-8");
    markBackedUp();
    toast("JSON 백업 파일을 내려받았어요.", { tone: "success" });
    refresh();
  };
  const snooze = () => {
    snoozeBackupNudge();
    refresh();
  };
  const dismissNames = () => {
    try {
      localStorage.setItem(NAMES_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setNamesDismissed(true);
  };

  const showNames = !namesDismissed && !wedding.groom_name.trim() && !wedding.bride_name.trim();
  if (!backup.show && !showNames) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {backup.show && (
          <motion.div
            key="backup"
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 shadow-[var(--shadow-sm)]"
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
              <HardDriveDownload className="size-4" />
            </span>
            <p className="min-w-[14rem] flex-1 text-[0.9375rem] leading-snug text-fg">
              {backup.days === null ? "이 브라우저에만 저장되고 있어요. " : `마지막 백업이 ${backup.days}일 전이에요. `}
              <span className="text-fg-2">브라우저 데이터가 지워지면 되돌릴 수 없으니 JSON 백업을 받아두세요.</span>
            </p>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <Button size="sm" onClick={backupNow}>
                <Download className="size-4" /> 지금 백업
              </Button>
              <Button size="sm" variant="ghost" onClick={snooze} title={`${BACKUP_NUDGE_DAYS}일 뒤에 다시 알려요`}>
                나중에
              </Button>
            </div>
          </motion.div>
        )}
        {showNames && (
          <motion.div
            key="names"
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 shadow-[var(--shadow-sm)]"
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
              <UserRound className="size-4" />
            </span>
            <p className="min-w-[14rem] flex-1 text-[0.9375rem] leading-snug text-fg">
              신랑 · 신부 이름을 적어두면 <span className="text-fg-2">홈과 청첩장 문구에 두 사람의 이름이 함께 보여요.</span>
            </p>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <Link href="/settings" className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3 text-[0.875rem] font-medium text-accent-fg hover:bg-accent-strong">
                이름 적기
              </Link>
              <button type="button" onClick={dismissNames} aria-label="이 안내 닫기" className="inline-flex size-9 items-center justify-center rounded-full text-fg-3 hover:bg-surface-2 hover:text-fg">
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
