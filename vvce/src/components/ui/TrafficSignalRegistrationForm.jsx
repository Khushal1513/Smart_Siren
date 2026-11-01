import { useState } from 'react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { TrafficCone, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TrafficSignalRegistrationForm = () => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    signalId: '',
    city: '',
    area: '',
    intersection: '',
    signalType: 'standard',
    hasPedestrianCrossing: false,
    hasCamera: false,
    status: 'active'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSelectChange = (name, value) => {
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  const handleCheckboxChange = (name, checked) => {
    setFormData(prevData => ({
      ...prevData,
      [name]: checked
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.signalId || !formData.city || !formData.area || !formData.intersection) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Replace with your actual API endpoint
      const response = await fetch('/api/traffic-signals/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        toast({
          title: "Registration successful",
          description: 'Traffic signal ${formData.signalId} has been registered'
        });
        setFormData({
          signalId: '',
          city: '',
          area: '',
          intersection: '',
          signalType: 'standard',
          hasPedestrianCrossing: false,
          hasCamera: false,
          status: 'active'
        });
        setOpen(false);
      } else {
        const data = await response.json();
        toast({
          title: "Registration failed",
          description: data.message || "An unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <TrafficCone className="mr-2 h-4 w-4" />
        Register Traffic Signal
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Traffic Signal</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signalId" className="required">Signal ID</Label>
                <Input
                  id="signalId"
                  name="signalId"
                  value={formData.signalId}
                  onChange={handleChange}
                  placeholder="Enter signal ID"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signalType">Signal Type</Label>
                <Select 
                  value={formData.signalType} 
                  onValueChange={(value) => handleSelectChange('signalType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="smart">Smart</SelectItem>
                    <SelectItem value="adaptive">Adaptive</SelectItem>
                    <SelectItem value="emergency">Emergency Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city" className="required">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="area" className="required">Area/District</Label>
                <Input
                  id="area"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Enter area or district"
                  required
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="intersection" className="required">Intersection</Label>
                <Input
                  id="intersection"
                  name="intersection"
                  value={formData.intersection}
                  onChange={handleChange}
                  placeholder="Enter intersection description"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col space-y-3 md:col-span-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hasPedestrianCrossing" 
                    checked={formData.hasPedestrianCrossing}
                    onCheckedChange={(checked) => handleCheckboxChange('hasPedestrianCrossing', checked)}
                  />
                  <Label 
                    htmlFor="hasPedestrianCrossing" 
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Has Pedestrian Crossing
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hasCamera" 
                    checked={formData.hasCamera}
                    onCheckedChange={(checked) => handleCheckboxChange('hasCamera', checked)}
                  />
                  <Label 
                    htmlFor="hasCamera" 
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Has Traffic Camera
                  </Label>
                </div>
              </div>
            </div>
            
            <DialogFooter className="sm:justify-end mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : 'Register'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrafficSignalRegistrationForm;