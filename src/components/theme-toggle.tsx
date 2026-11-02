import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isThemePreference, useTheme } from "@/lib/theme";
import { useHydrated } from "@/lib/use-hydrated";

export function ThemeToggle() {
  const { preference, resolved, persistent, setTheme } = useTheme();
  const hydrated = useHydrated();
  const Icon =
    preference === "system" ? Monitor : preference === "dark" ? Moon : Sun;
  return (
    <div className="theme-dock">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={!hydrated}
            aria-label="Appearance settings"
            className="theme-trigger"
          >
            <Icon size={16} />
            <span>Appearance</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-64">
          <DropdownMenuLabel>Make yourself comfortable.</DropdownMenuLabel>
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            Choose a look for this device.
          </p>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={preference}
            onValueChange={(value) => {
              if (isThemePreference(value)) setTheme(value);
            }}
          >
            <DropdownMenuRadioItem value="light">
              <Sun size={16} className="mr-2" />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon size={16} className="mr-2" />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor size={16} className="mr-2" />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <p className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
            <Check size={13} />
            {preference === "system"
              ? `Following your device · ${resolved} now`
              : `${preference === "dark" ? "Dark" : "Light"} mode · ${persistent ? "saved on this device" : "this tab only"}`}
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
