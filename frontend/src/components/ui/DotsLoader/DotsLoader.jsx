import styles from "./DotsLoader.module.scss";

export default function DotsLoader({ size = 6 }) {
  return (
    <span className={styles.dots} style={{ gap: size }}>
      <span />
      <span />
      <span />
    </span>
  );
}
