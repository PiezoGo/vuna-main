"use client";

import { Inbox, Smartphone } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Logo, LogoMark } from "@/components/brand/logo";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatKES } from "@/lib/format";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h2>
      <div className="rounded-2xl border bg-card p-6 shadow-soft">{children}</div>
    </section>
  );
}

const swatches = [
  ["primary", "bg-primary"],
  ["primary-hover", "bg-primary-hover"],
  ["primary-soft", "bg-primary-soft"],
  ["background", "bg-background"],
  ["muted", "bg-muted"],
  ["border", "bg-border"],
  ["success", "bg-success"],
  ["mpesa", "bg-mpesa"],
  ["warning", "bg-warning"],
  ["destructive", "bg-destructive"],
] as const;

export function DesignSystemShowcase() {
  const [market, setMarket] = React.useState<string>();
  const phoneError = "Enter a Safaricom number like 0712 345 678.";

  return (
    <div className="container-page grid gap-10 py-10">
      <PageHeader
        eyebrow="Dev only"
        title="VUNA design system"
        description="Every primitive in one place. This page returns 404 in production."
      />

      <Section title="Brand">
        <div className="flex flex-wrap items-center gap-8">
          <Logo />
          <LogoMark className="size-14" />
          <LogoMark className="size-8" />
          <p className="font-display text-3xl font-semibold">Fraunces display heading</p>
          <p>Inter body text, 16px.</p>
        </div>
      </Section>

      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {swatches.map(([name, cls]) => (
            <div key={name} className="grid gap-2">
              <div className={`h-14 rounded-xl border ${cls}`} />
              <span className="font-mono text-xs text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="mpesa">
            <Smartphone /> Pay with M-Pesa
          </Button>
          <Button variant="link">Link</Button>
          <Button loading>Saving</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Farmer</Badge>
          <Badge variant="solid">Featured</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Paid</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="destructive">Cancelled</Badge>
          <Badge variant="muted">Draft</Badge>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid gap-6 md:grid-cols-2">
          <Field htmlFor="ds-name" label="Full name" required hint="As it appears on your ID.">
            <Input id="ds-name" placeholder="Wanjiku Kamau" aria-describedby="ds-name-hint" />
          </Field>
          <Field htmlFor="ds-phone" label="M-Pesa number" error={phoneError}>
            <Input
              id="ds-phone"
              inputMode="tel"
              defaultValue="0712"
              aria-invalid
              aria-describedby={fieldDescribedBy("ds-phone", { error: phoneError })}
            />
          </Field>
          <Field htmlFor="ds-market" label="Market">
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger id="ds-market">
                <SelectValue placeholder="Select a market" />
              </SelectTrigger>
              <SelectContent>
                {["Muthurwa", "Wakulima", "Marikiti", "Other"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field htmlFor="ds-notes" label="Delivery notes">
            <Textarea id="ds-notes" placeholder="Gate code, landmarks…" />
          </Field>
          <div className="flex items-center gap-3">
            <Checkbox id="ds-terms" />
            <Label htmlFor="ds-terms">I agree to the terms</Label>
          </div>
          <RadioGroup defaultValue="hotel" className="flex flex-wrap gap-5">
            {["hotel", "retailer", "wholesaler"].map((v) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem value={v} id={`ds-${v}`} />
                <Label htmlFor={`ds-${v}`} className="capitalize">
                  {v}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </Section>

      <Section title="Card, avatar, money">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Red onions</CardTitle>
              <CardDescription>Peter Kamau · Kiambu</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-primary">{formatKES("3240")}</span>
              <span className="text-sm text-muted-foreground">/ sack</span>
            </CardContent>
            <CardFooter>
              <Button className="flex-1">Add to cart</Button>
            </CardFooter>
          </Card>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials("Peter Kamau")}</AvatarFallback>
            </Avatar>
            <Avatar className="size-12">
              <AvatarFallback>{initials("Amina")}</AvatarFallback>
            </Avatar>
            <Separator orientation="vertical" className="h-10" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Overlays and feedback">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm order</DialogTitle>
                <DialogDescription>
                  You&apos;ll get an M-Pesa prompt on your phone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button variant="mpesa">Pay {formatKES(6480)}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Your cart</SheetTitle>
                <SheetDescription>Items from 2 farmers</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Wanjiku Kamau</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>Logistics is included in the listed price.</TooltipContent>
          </Tooltip>
          <Button variant="secondary" onClick={() => toast.success("Order placed")}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => toast.error("Payment failed. Try again.")}>
            Error toast
          </Button>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <EmptyState
              icon={Inbox}
              title="No orders yet"
              description="When buyers order your produce, it will show up here."
              action={<Button>Add a listing</Button>}
            />
          </TabsContent>
          <TabsContent value="history">
            <p className="text-sm text-muted-foreground">Past orders appear here.</p>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Dashboard shell (farmer)">
        <div className="h-[520px] overflow-hidden rounded-xl border">
          <div className="h-full origin-top-left scale-100 overflow-auto">
            <DashboardShell
              role="farmer"
              topbarEnd={<Badge variant="muted">user menu (Module 2)</Badge>}
            >
              <PageHeader
                title="Good morning, Peter"
                description="Here's what's happening on your farm today."
              />
            </DashboardShell>
          </div>
        </div>
      </Section>
    </div>
  );
}
