'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldGroup, FieldLabel } from '@/components/ui/field';
import { toast } from 'sonner';

interface AdvancedOptions {
  customAlias?: string;
  passwordProtected: boolean;
  password?: string;
  expirationTime?: string; // '1hour', '1day', '7days', '30days', 'never'
  description?: string;
}

interface LinkCreationProps {
  onLinkCreated?: (link: any) => void;
  disabled?: boolean;
}

export function AdvancedLinkCreation({ onLinkCreated, disabled }: LinkCreationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customAlias, setCustomAlias] = useState('');
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [expirationTime, setExpirationTime] = useState('never');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (passwordProtected && !password.trim()) {
      toast.error('Please enter a password');
      return;
    }

    if (customAlias && customAlias.length < 3) {
      toast.error('Alias must be at least 3 characters');
      return;
    }

    setLoading(true);
    try {
      const options: AdvancedOptions = {
        customAlias: customAlias || undefined,
        passwordProtected,
        password: passwordProtected ? password : undefined,
        expirationTime: expirationTime !== 'never' ? expirationTime : undefined,
        description: description || undefined,
      };

      onLinkCreated?.(options);

      // Reset form
      setCustomAlias('');
      setPassword('');
      setExpirationTime('never');
      setDescription('');
      setPasswordProtected(false);
      setIsOpen(false);

      toast.success('Advanced options saved!');
    } catch (error) {
      toast.error('Failed to save options');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          variant="outline"
          className="border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200"
        >
          <Zap className="w-4 h-4 mr-2" />
          Advanced Options
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-purple-500/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Advanced Link Options</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Custom Alias */}
          <FieldGroup>
            <FieldLabel className="text-white">Custom Alias (Optional)</FieldLabel>
            <Input
              placeholder="my-custom-link"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              className="bg-input border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-400"
            />
            <p className="text-xs text-gray-400 mt-1">Custom short codes must be 3+ characters</p>
          </FieldGroup>

          {/* Password Protection */}
          <FieldGroup>
            <div className="flex items-center justify-between">
              <FieldLabel className="text-white mb-0">Password Protection</FieldLabel>
              <Switch checked={passwordProtected} onCheckedChange={setPasswordProtected} />
            </div>
            {passwordProtected && (
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 bg-input border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-400"
              />
            )}
          </FieldGroup>

          {/* Expiration */}
          <FieldGroup>
            <FieldLabel className="text-white">Link Expiration</FieldLabel>
            <Select value={expirationTime} onValueChange={setExpirationTime}>
              <SelectTrigger className="bg-input border-purple-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-purple-500/30">
                <SelectItem value="never" className="text-white">Never Expires</SelectItem>
                <SelectItem value="1hour" className="text-white">1 Hour</SelectItem>
                <SelectItem value="1day" className="text-white">1 Day</SelectItem>
                <SelectItem value="7days" className="text-white">7 Days</SelectItem>
                <SelectItem value="30days" className="text-white">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>

          {/* Description */}
          <FieldGroup>
            <FieldLabel className="text-white">Description (Optional)</FieldLabel>
            <Input
              placeholder="Add a note for this link"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-input border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-400"
            />
          </FieldGroup>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="flex-1 border-gray-500/30 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            {loading ? 'Saving...' : 'Save Options'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
