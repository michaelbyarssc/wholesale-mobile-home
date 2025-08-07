import React from 'react';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';
import { AppointmentBookingWidget } from '@/components/appointments/AppointmentBookingWidget';
import { MyAppointments } from '@/components/appointments/MyAppointments';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
const Appointments = () => {
  const { user, userProfile, isLoading, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const handleProfileUpdated = () => {
    // Force profile refresh - useAuth will automatically re-fetch
    console.log('Profile update requested');
  };
  return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      <Header user={user} userProfile={userProfile} cartItems={[]} isLoading={isLoading} onLogout={handleLogout} onToggleCart={() => {}} onProfileUpdated={handleProfileUpdated} />
      
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Schedule an Appointment</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Book an appointment to talk with a representative about our mobile homes. Our experienced team will guide you through your options and answer all your questions.</p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 justify-items-center">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Flexible Scheduling</h3>
                <p className="text-sm text-muted-foreground">
                  Book appointments that fit your schedule, including weekends
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Expert Guidance</h3>
                <p className="text-sm text-muted-foreground">Talk with our knowledgeable sales team and mobile home experts</p>
              </CardContent>
            </Card>
            
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <Clock className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">No Pressure</h3>
                <p className="text-sm text-muted-foreground">
                  Take your time to explore and ask questions without pressure
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Booking Widget */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Book New Appointment</h2>
              <AppointmentBookingWidget userId={user?.id} />
            </div>

            {/* User's Appointments */}
            <div>
              <h2 className="text-2xl font-bold mb-6">My Appointments</h2>
              <MyAppointments userId={user?.id} />
            </div>
          </div>

          {/* Information Section */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle>What to Expect During Your Call</CardTitle>
              <CardDescription>Make the most of your call with these helpful tips</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Before Your Call</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Think about your budget and financing needs</li>
                    <li>• Consider the size and layout you prefer</li>
                    <li>• Prepare a list of questions about features and options</li>
                    <li>• Think about your delivery location and timeline</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">During Your Call</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• View multiple models to compare features</li>
                    <li>• Ask about customization options and upgrades</li>
                    <li>• Discuss financing options and payment plans</li>
                    <li>• Learn about delivery, setup, and warranty details</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help Scheduling?</CardTitle>
              <CardDescription>
                Our team is here to help you find the perfect time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">Call Us</h4>
                  <p className="text-sm text-muted-foreground mb-2">Speak with our scheduling team</p>
                  <p className="font-medium">(864) 680-4030</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2"> Business Hours </h4>
                  <p className="text-sm text-muted-foreground mb-2">Give us a call or schedule a call above</p>
                  <p className="font-medium">Mon-Sat 8AM-6PM</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">After Hours</h4>
                  <p className="text-sm text-muted-foreground mb-2">Email us anytime</p>
                  <p className="font-medium">Info@WholesaleMobileHome.com</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>;
};
export default Appointments;