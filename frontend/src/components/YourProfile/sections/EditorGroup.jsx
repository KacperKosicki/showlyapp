import styles from './AppearanceSection.module.scss';

export const EditorSectionHeader = ({ kicker, title, description, icon }) => (
  <header className={styles.header}>
    <div>
      <span className={styles.kicker}>{kicker}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    {icon}
  </header>
);

const EditorGroup = ({ title, description, children, className = '' }) => (
  <fieldset className={`${styles.group} ${className}`}>
    <legend>{title}</legend>
    {description && <p className={styles.groupDescription}>{description}</p>}
    <div className={styles.groupContent}>{children}</div>
  </fieldset>
);

export default EditorGroup;
