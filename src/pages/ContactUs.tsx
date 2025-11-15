import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Clock, Users, AlertTriangle, ExternalLink } from "lucide-react";

import { useState, useMemo } from "react";
import { useContactsData } from "@/hooks/useContactsData";
import { useSitesData } from "@/hooks/useSitesData";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const ContactUs = () => {
  const contactsData = useContactsData();
  const [filterState, setFilterState] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterParty, setFilterParty] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContacts = useMemo(() => {
    return contactsData.filter(contact => {
      const stateMatch = filterState === "all" || contact.state === filterState;
      const roleMatch = filterRole === "all" || contact.role === filterRole;
      const partyMatch = filterParty === "all" || contact.party === filterParty;
      const searchMatch = searchTerm === "" || 
                          contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contact.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contact.phone.toLowerCase().includes(searchTerm.toLowerCase());
      return stateMatch && roleMatch && partyMatch && searchMatch;
    });
  }, [contactsData, filterState, filterRole, filterParty, searchTerm]);

  const lmlContacts = filteredContacts.filter(c => c.party === 'Us');
  const clientContacts = filteredContacts.filter(c => c.party === 'Client');
  const contractorContacts = filteredContacts.filter(c => c.party === 'Contractor');

  // Memoize filter options to avoid recreating Sets on every render
  const states = useMemo(() =>
    [...new Set(contactsData.map(c => c.state).filter(Boolean))],
    [contactsData]
  );

  const roles = useMemo(() =>
    [...new Set(contactsData.map(c => c.role).filter(Boolean))],
    [contactsData]
  );


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contact Information</h1>
          <p className="text-muted-foreground">Emergency contacts and support resources for vertical transport services</p>
        </div>

        <div className="flex space-x-4 mb-4">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-1/2"
          />
          <Select value={filterParty} onValueChange={setFilterParty}>
            <SelectTrigger className="w-full md:w-1/4">
              <SelectValue placeholder="Filter by party" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parties</SelectItem>
              <SelectItem value="Us">LML</SelectItem>
              <SelectItem value="Client">Client</SelectItem>
              <SelectItem value="Contractor">Contractor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterState} onValueChange={setFilterState}>
            <SelectTrigger className="w-full md:w-1/4">
              <SelectValue placeholder="Filter by state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full md:w-1/4">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map(role => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Emergency Banner */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Emergency Situations</h3>
                <p className="text-sm text-muted-foreground">
                  For immediate assistance with safety emergencies, call <strong>000</strong> first, 
                  then contact the appropriate service provider below.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  LML Lift Consultants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lmlContacts.map((contact, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{contact.name}</h4>
                        <p className="text-sm text-muted-foreground">{contact.role} - {contact.level} {contact.state}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {clientContacts.map((contact, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{contact.name}</h4>
                        <p className="text-sm text-muted-foreground">{contact.role} - {contact.site}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contractor Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contractorContacts.map((contact, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{contact.name}</h4>
                        <p className="text-sm text-muted-foreground">{contact.role} - {contact.contractor} {contact.state}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};


export default ContactUs;

