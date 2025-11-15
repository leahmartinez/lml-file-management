import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Site } from '@/types/data';

interface AddSiteModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (site: Omit<Site, 'projects' | 'assets'>) => void;
}

const states = [
  'New South Wales',
  'Victoria',
  'Queensland',
  'South Australia',
  'Western Australia',
  'Tasmania',
  'ACT',
  'Northern Territory',
  'New Zealand',
];

const AddSiteModal: React.FC<AddSiteModalProps> = ({ open, onClose, onSave }) => {
  const [building, setBuilding] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Australia');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!building.trim()) {
      toast({
        title: "Validation Error",
        description: "Building name is required",
        variant: "destructive",
      });
      return;
    }

    if (!address.trim()) {
      toast({
        title: "Validation Error",
        description: "Address is required",
        variant: "destructive",
      });
      return;
    }

    if (!state) {
      toast({
        title: "Validation Error",
        description: "State is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const newSite: Omit<Site, 'projects' | 'assets'> = {
        building: building.trim(),
        address: address.trim(),
        state: state,
        city: city.trim() || '',
        country: country.trim() || 'Australia',
      };

      onSave(newSite);
      
      toast({
        title: "Success",
        description: `Site "${building}" has been added successfully`,
      });

      // Reset form
      setBuilding('');
      setAddress('');
      setState('');
      setCity('');
      setCountry('Australia');
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add site. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Site</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="building">Building Name *</Label>
              <Input
                id="building"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g., Tower A"
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 123 High Street, Sydney NSW 2000"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Sydney"
                />
              </div>

              <div>
                <Label htmlFor="state">State/Territory *</Label>
                <Select value={state} onValueChange={setState} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g., Australia"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Site'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSiteModal;

