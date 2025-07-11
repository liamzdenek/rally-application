import React from 'react'
import styles from './Card.module.css'

interface CardProps {
  children: React.ReactNode
  title?: string
  className?: string
  onClick?: () => void
  variant?: 'default' | 'highlighted' | 'warning'
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  className = '',
  onClick,
  variant = 'default'
}) => {
  const classes = [
    styles.card,
    styles[variant],
    onClick && styles.clickable,
    className
  ].filter(Boolean).join(' ')

  return (
    <div 
      className={classes}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  )
}

export default Card