import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Clock, X } from "lucide-react";
import { filterUpcomingScheduleDays } from "@/lib/booking-flow";
import { getSessionBadgeLabel } from "@/lib/session-badges";
import {
  formatScheduleDayHeader,
  getRollingWeekDateRange,
} from "@shared/schedule-display";
import hathaYogaImg from "@assets/hatha yoga_1756809174781.jpg";
import hyyocrossImg from "@assets/Hyyocross_1756809174781.jpg";
import meditationImg from "@assets/meditation_1756809174781.jpg";
import soundtherapyImg from "@assets/soundtherapy_1756809174781.jpg";

interface ClassType {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  imageUrl?: string;
}

interface ScheduleDay {
  day: string;
  date: Date;
  classes: Array<{
    id: string;
    date: Date;
    classType: ClassType;
    instructor: {
      id: string;
      name: string;
    };
    currentBookings: number;
    maxCapacity: number;
    sessionFrequency?: string | null;
    deliveryMode?: string | null;
  }>;
}

interface ScheduleSectionProps {
  onBookingClick: (classId?: string) => void;
}

export default function ScheduleSection({ onBookingClick }: ScheduleSectionProps) {
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: weeklySchedule, isLoading, error } = useQuery<ScheduleDay[]>({
    queryKey: ['/api/schedule/week'],
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const upcomingSchedule = useMemo(
    () => (weeklySchedule ? filterUpcomingScheduleDays(weeklySchedule) : []),
    [weeklySchedule],
  );

  const rollingWeek = useMemo(() => getRollingWeekDateRange(), []);

  const getClassDescriptions = () => {
    return {
      "Hatha Yoga": {
        description: "Perfect for beginners, Hatha Yoga focuses on basic postures and breathing techniques. This gentle practice emphasizes alignment, flexibility, and mindfulness. Each pose is held for several breaths, allowing you to build strength and stability while learning proper form. Our certified instructors provide personalized guidance to ensure you feel comfortable and supported throughout your practice.",
        imageUrl: hathaYogaImg
      },
      "Hyyocross": {
        description: "A dynamic hybrid fitness experience combining yoga with cross-training elements including weights, aerobics, Zumba, and Bhangra. Yoga remains the foundation, but each class varies based on participant demographics and energy levels. This high-energy session builds strength, improves cardiovascular health, and enhances flexibility while keeping you engaged with diverse movement patterns.",
        imageUrl: hyyocrossImg
      },
      "Meditation": {
        description: "Find inner peace and mental clarity through guided meditation practices. These sessions focus on various techniques including mindfulness, breathwork, and visualization to reduce stress and enhance emotional well-being. Whether you're a beginner or experienced meditator, our tranquil environment and expert guidance will help you develop a deeper connection with yourself.",
        imageUrl: meditationImg
      },
      "Sound Therapy": {
        description: "Experience the healing power of sound through therapeutic vibrations using singing bowls, gongs, and crystal instruments. These sessions promote deep relaxation, stress recovery, and emotional healing. The resonant frequencies help balance your energy centers and create a meditative state that supports overall wellness and mental clarity.",
        imageUrl: soundtherapyImg
      }
    };
  };

  const formatTimeIST = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatLocalTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleMoreClick = (classType: ClassType) => {
    setSelectedClass(classType);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedClass(null);
  };

  if (error) {
    return (
      <section id="schedule" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-destructive mb-4">
              Unable to Load Schedule
            </h2>
            <p className="text-xl text-purple-600">
              Please try again later or contact support if the problem persists.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="schedule" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4 text-center">
            Week {rollingWeek.weekNumber} ({rollingWeek.label}) Schedule
          </h2>
          <p className="text-xl text-purple-500 max-w-2xl mx-auto">
            Find the perfect time for your practice
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="bg-card rounded-lg shadow-lg overflow-hidden">
            <div className="bg-primary text-primary-foreground p-6 text-center">
              <h3 className="text-2xl font-bold">This Week's Classes</h3>
            </div>
            
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-6">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="border-b border-border pb-6 mb-6 last:border-b-0 last:mb-0">
                      <Skeleton className="h-6 w-24 mb-4" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-20 w-full rounded-lg" />
                        <Skeleton className="h-20 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingSchedule.length > 0 ? (
                <div className="space-y-6">
                  {upcomingSchedule.map((day) => (
                    <div key={day.day} className="border-b border-border pb-6 mb-6 last:border-b-0 last:mb-0">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <p
                          className="text-sm font-semibold text-primary tracking-wide px-2"
                          data-testid={`schedule-day-${day.day}`}
                        >
                          {formatScheduleDayHeader(day.date)}
                        </p>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {day.classes.map((cls) => {
                          const descriptions = getClassDescriptions();
                          const classDesc = descriptions[cls.classType.name as keyof typeof descriptions];
                          return (
                            <div key={cls.id} className="p-3 bg-card rounded-lg shadow-md border">
                              {/* First Line: Heading and Instructor */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                  <h5 className="text-base font-bold text-primary" data-testid={`class-name-${cls.id}`}>
                                    {cls.classType.name}
                                  </h5>
                                  <p className="text-sm text-purple-600" data-testid={`instructor-${cls.id}`}>
                                    With {cls.instructor.name}
                                  </p>
                                  {getSessionBadgeLabel(cls.sessionFrequency, cls.deliveryMode) && (
                                    <Badge className="mt-1 bg-[#3d1b80] text-white">
                                      {getSessionBadgeLabel(cls.sessionFrequency, cls.deliveryMode)}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="flex items-center gap-1 text-sm font-medium">
                                        <Clock className="h-4 w-4" />
                                        <span data-testid={`class-time-${cls.id}`}>
                                          {formatTimeIST(cls.date)} IST
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Local time: {formatLocalTime(cls.date)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                              
                              {/* Second Line: Price, Spots, and Buttons */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <span className="text-lg font-bold text-primary">
                                    ₹{cls.classType.price || (cls.classType.name === 'Hatha Yoga' ? 500 : cls.classType.name === 'Meditation' ? 400 : cls.classType.name === 'Sound Therapy' ? 800 : 600)}
                                  </span>
                                  <span className="text-xs text-purple-600" data-testid={`capacity-${cls.id}`}>
                                    {cls.currentBookings}/{cls.maxCapacity} spots filled
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleMoreClick({
                                      id: cls.classType.id,
                                      name: cls.classType.name,
                                      description: classDesc?.description || '',
                                      duration: cls.classType.name === 'Meditation' ? 45 : 60,
                                      price: cls.classType.price || (cls.classType.name === 'Hatha Yoga' ? 500 : cls.classType.name === 'Meditation' ? 400 : cls.classType.name === 'Sound Therapy' ? 800 : 600),
                                      imageUrl: classDesc?.imageUrl
                                    })}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs border-primary text-primary hover:bg-primary hover:text-white font-bold"
                                    data-testid={`more-info-${cls.id}`}
                                  >
                                    ...More
                                  </Button>
                                  <Button
                                    onClick={() => onBookingClick(cls.id)}
                                    size="sm"
                                    className="bg-primary text-white font-bold hover:bg-primary/90 text-xs"
                                    disabled={cls.currentBookings >= cls.maxCapacity}
                                    data-testid={`book-class-${cls.id}`}
                                  >
                                    {cls.currentBookings >= cls.maxCapacity ? "Full" : "Book"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-2xl font-semibold text-purple-600 mb-4">
                    No upcoming classes this week
                  </h3>
                  <p className="text-purple-600">
                    Please check back later for new sessions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Class Description Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary text-center">
              {selectedClass?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedClass && (
            <div className="text-center space-y-4">
              <img
                src={selectedClass.imageUrl}
                alt={selectedClass.name}
                className="w-full h-48 object-cover rounded-lg mx-auto"
                onError={(e) => {
                  console.log('Image failed to load:', selectedClass.imageUrl);
                  e.currentTarget.src = '/api/placeholder/400/300';
                }}
              />
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-primary">
                  {selectedClass.name}
                </h3>
                <p className="text-lg font-semibold">
                  Duration: {selectedClass.duration} minutes
                </p>
                <p className="text-xl font-bold text-primary">
                  ₹{selectedClass.price}
                </p>
              </div>
              <div className="text-center">
                <p className="text-purple-600 leading-relaxed">
                  {selectedClass.description}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
