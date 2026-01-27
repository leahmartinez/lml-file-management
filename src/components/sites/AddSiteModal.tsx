import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete, AddressComponents } from '@/components/ui/AddressAutocomplete';
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
  const [postcode, setPostcode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddressChange = (newAddress: string, placeDetails?: AddressComponents) => {
    setAddress(newAddress);

    if (placeDetails) {
      // Auto-fill city, state, and postcode from Google Places data
      if (placeDetails.locality) {
        setCity(placeDetails.locality);
      }
      if (placeDetails.administrativeArea) {
        // Map abbreviations to full state names
        const stateMapping: Record<string, string> = {
          'NSW': 'New South Wales',
          'VIC': 'Victoria',
          'QLD': 'Queensland',
          'SA': 'South Australia',
          'WA': 'Western Australia',
          'TAS': 'Tasmania',
          'ACT': 'ACT',
          'NT': 'Northern Territory',
        };
        const mappedState = stateMapping[placeDetails.administrativeArea] || placeDetails.administrativeArea;
        setState(mappedState);
      }
      if (placeDetails.postalCode) {
        setPostcode(placeDetails.postalCode);
      }
    }
  };

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
        postcode: postcode.trim() || '',
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
      setPostcode('');
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
              <AddressAutocomplete
                id="address"
                value={address}
                onChange={handleAddressChange}
                placeholder="Start typing an address..."
                required
                countryRestrict="au"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
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

              <div>
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="e.g., 2000"
                />
              </div>
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

