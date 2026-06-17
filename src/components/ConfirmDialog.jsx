import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  countdown = 0,
}) {
  const [remaining, setRemaining] = useState(countdown);

  useEffect(() => {
    if (isOpen && countdown > 0) {
      setRemaining(countdown);
      const timer = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const isConfirmDisabled = countdown > 0 && remaining > 0;

  return (
    <div
      className={styles.wrapper}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <div className={styles.headerIcon}>
              <AlertTriangle size={20} />
            </div>
            <span className={styles.headerTitle}>{title}</span>
          </div>
          {isConfirmDisabled && (
            <span className={styles.countdownBadge}>{remaining}s</span>
          )}
        </div>
        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            disabled={isConfirmDisabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!isConfirmDisabled) onConfirm();
            }}
          >
            {isConfirmDisabled ? `${confirmText} (${remaining}s)` : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
