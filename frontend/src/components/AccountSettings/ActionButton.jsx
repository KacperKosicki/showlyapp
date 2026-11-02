import styles from './AccountSettings.module.scss';

const LoadingDots = ({ active }) => (
  <span
    className={`${styles.loadingDots} ${active ? styles.loadingDotsActive : ""
      }`}
    aria-hidden="true"
  >
    <span />
    <span />
    <span />
  </span>
);

export const ButtonContent = ({ icon, children, isLoading }) => (
  <span
    className={styles.btnContent}
    data-loading={isLoading ? "true" : "false"}
  >
    <span className={styles.btnNormalContent}>
      {icon && <span className={styles.btnIcon}>{icon}</span>}
      <span className={styles.btnLabel}>{children}</span>
    </span>

    {typeof isLoading === "boolean" && (
      <LoadingDots active={isLoading} />
    )}
  </span>
);

const ActionButton = ({
  isLoading = false,
  disabled = false,
  onClick,
  className = "",
  icon,
  children,
}) => (
  <button
    type="button"
    className={`${styles.button} ${className}`}
    disabled={disabled || isLoading}
    onClick={onClick}
    aria-busy={isLoading ? "true" : "false"}
    data-loading={isLoading ? "true" : "false"}
  >
    <ButtonContent icon={icon} isLoading={isLoading}>
      {children}
    </ButtonContent>
  </button>
);

export default ActionButton;
