import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    hoverable?: boolean;
}

export function Card({ children, className, style, onClick, hoverable = false }: CardProps) {
    return (
        <div
            className={cn(
                'bg-card border border-default rounded-xl p-4 shadow-card',
                hoverable && 'cursor-pointer hover:border-[var(--color-border-hover)] hover:shadow-lg transition-all duration-200',
                onClick && 'cursor-pointer',
                className
            )}
            style={style}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
    return (
        <div className={cn('flex items-start justify-between mb-4', className)}>
            <div>
                <h3 className="text-lg font-semibold text-primary">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-secondary mt-0.5">{subtitle}</p>
                )}
            </div>
            {action}
        </div>
    );
}

interface ProgressBarProps {
    value: number;
    max?: number;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const progressSizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
};

export function ProgressBar({
    value,
    max = 100,
    color,
    size = 'md',
    showLabel = false,
    className,
}: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className={cn('w-full', className)}>
            {showLabel && (
                <div className="flex justify-between text-sm text-secondary mb-1">
                    <span>{value} / {max}</span>
                    <span>{Math.round(percentage)}%</span>
                </div>
            )}
            <div className={cn('w-full bg-secondary rounded-full overflow-hidden', progressSizeClasses[size])}>
                <div
                    className={cn('h-full rounded-full transition-all duration-300', color || 'bg-[var(--color-accent)]')}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

interface ProgressRingProps {
    value: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
    children?: React.ReactNode;
}

export function ProgressRing({
    value,
    max = 100,
    size = 80,
    strokeWidth = 8,
    color = 'var(--color-accent)',
    backgroundColor = 'var(--color-bg-tertiary)',
    children,
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={backgroundColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500"
                />
            </svg>
            {children && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {children}
                </div>
            )}
        </div>
    );
}

interface BadgeProps {
    children: React.ReactNode;
    color?: string;
    variant?: 'solid' | 'outline';
    size?: 'sm' | 'md';
    className?: string;
}

const badgeSizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
};

export function Badge({
    children,
    color,
    variant = 'solid',
    size = 'sm',
    className,
}: BadgeProps) {
    const bgColor = color || 'var(--color-accent)';

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full font-medium',
                badgeSizeClasses[size],
                variant === 'solid' ? 'text-white' : 'border-2',
                className
            )}
            style={{
                backgroundColor: variant === 'solid' ? bgColor : 'transparent',
                borderColor: variant === 'outline' ? bgColor : undefined,
                color: variant === 'outline' ? bgColor : undefined,
            }}
        >
            {children}
        </span>
    );
}

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
            <div className="p-4 rounded-full bg-secondary mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-primary mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-secondary max-w-sm mb-4">{description}</p>
            )}
            {action}
        </div>
    );
}

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn('animate-pulse bg-secondary rounded', className)} />
    );
}
