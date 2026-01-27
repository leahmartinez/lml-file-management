import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete, AddressComponents } from '@/components/ui/AddressAutocomplete';
import { toast } from '@/hooks/use-toast';
import { Site } from '@/types/data';

interface EditSiteModalProps {
  open: boolean;
  site: Site | null;
  onClose: () => void;
  onSave: (site: Site) => void;
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

const EditSiteModal: React.FC<EditSiteModalProps> = ({ open, site, onClose, onSave }) => {
  const [building, setBuilding] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Australia');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (site) {
      setBuilding(site.building || '');
      setAddress(site.address || '');
      setState(site.state || '');
      setCity(site.city || '');
      setCountry(site.country || 'Australia');
    }
  }, [site]);

  const handleAddressChange = (newAddress: string, placeDetails?: AddressComponents) => {
    setAddress(newAddress);

    if (placeDetails) {
      // Auto-fill city, state, and country from Google Places data
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
      if (placeDetails.country) {
        setCountry(placeDetails.country);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!site) return;

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
      const updatedSite: Site = {
        ...site,
        building: building.trim(),
        address: address.trim(),
        state: state,
        city: city.trim() || '',
        country: country.trim() || 'Australia',
      };

      onSave(updatedSite);
      
      toast({
        title: "Success",
        description: `Site "${building}" has been updated successfully`,
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update site. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!site) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Site: {site.building}</DialogTitle>
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSiteModal;

