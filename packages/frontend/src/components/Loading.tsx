import React from 'react'
import styles from './Loading.module.css'

interface LoadingProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'medium', 
  message = 'Loading...' 
}) => {
  return (
    <div className={styles.loading}>
      <div className={`${styles.spinner} ${styles[size]}`}>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
        <div className={styles.dot}></div>
      </div>
      {message && <p className={styles.message}>{message}</p>}
    </div>
  )
}

export default Loading