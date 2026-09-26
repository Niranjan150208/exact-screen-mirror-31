import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Radar } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="gradient-brand flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground">
              <Radar className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold">FindBack</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Lost something? Let's bring it back. Smart matching and verified handovers for
            campuses, events and public spaces.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Platform</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/browse" className="hover:text-foreground">
                Browse items
              </Link>
            </li>
            <li>
              <Link to="/report/lost" className="hover:text-foreground">
                Report a lost item
              </Link>
            </li>
            <li>
              <Link to="/report/found" className="hover:text-foreground">
                Report a found item
              </Link>
            </li>
            <li>
              <Link to="/impact" className="hover:text-foreground">
                Impact dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Trust &amp; safety</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Verification before handover</li>
            <li>Private contact details</li>
            <li>Approximate locations only</li>
            <li>Admin moderation</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> help@findback.app
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> +91 90000 00000
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Campus Help Desk, Block A
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FindBack. Built for faster, safer recoveries.
      </div>
    </footer>
  );
}
