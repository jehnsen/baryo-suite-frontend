"use client"

import Link from "next/link"
import { Fragment } from "react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

export interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null
  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={`${item.label}-${i}`}>
              <BreadcrumbItem>
                {last || !item.href ? (
                  <BreadcrumbPage className="max-w-48 truncate">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last && <BreadcrumbSeparator />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
