import { CheckCircle, Users, Award, Heart } from "lucide-react";
import Card from "@/components/ui/Card";

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: "Made with Love",
      description: "Every dish is prepared with passion and care, using traditional recipes passed down through generations.",
    },
    {
      icon: Award,
      title: "Quality Ingredients",
      description: "We source only the freshest ingredients to ensure the best taste and quality in every meal.",
    },
    {
      icon: Users,
      title: "Community Focused",
      description: "We're proud to be part of the Botwe community, serving authentic Ghanaian cuisine to our neighbors.",
    },
    {
      icon: CheckCircle,
      title: "Affordable Prices",
      description: "Great food shouldn't break the bank. We offer delicious meals at prices everyone can afford.",
    },
  ];

  return (
    <div className="py-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 display-font">
            About Anis Food and Drink
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Serving authentic Ghanaian cuisine in the heart of Botwe, Accra
          </p>
        </div>

        {/* Story Section */}
        <div className="mb-16">
          <Card className="p-8 md:p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 display-font">Our Story</h2>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
              <p>
                Anis Food and Drink was born from a simple passion: to bring authentic, 
                delicious Ghanaian cuisine to our community at prices that everyone can afford. 
                Located in the vibrant neighborhood of Botwe, Accra, we've become a beloved 
                destination for food lovers seeking traditional flavors.
              </p>
              <p>
                Our journey began with a commitment to quality and authenticity. Every dish 
                on our menu is prepared using time-honored recipes, fresh ingredients, and 
                the expertise of our experienced chefs. We believe that great food brings 
                people together, and we're honored to be part of your dining experience.
              </p>
              <p>
                From our signature jollof rice to perfectly grilled chicken, each meal is 
                crafted with care and served with a smile. We're not just a restaurant—we're 
                a part of the Botwe community, and we're here to serve you.
              </p>
            </div>
          </Card>
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center display-font">
            What Makes Us Special
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} hover className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-[#DC2626] p-3 rounded-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {value.title}
                      </h3>
                      <p className="text-gray-600">{value.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="bg-gradient-to-r from-[#DC2626] to-[#F97316] rounded-2xl p-8 md:p-12 text-white">
          <h2 className="text-3xl font-bold mb-6 display-font">Why Choose Anis Food and Drink?</h2>
          <ul className="space-y-4 text-lg">
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <span>Authentic Ghanaian recipes prepared by experienced chefs</span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <span>Fresh ingredients sourced daily for maximum flavor</span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <span>Affordable prices without compromising on quality</span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <span>Friendly service in a welcoming atmosphere</span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <span>Convenient delivery and pickup options</span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1" />
              <span>High standards of hygiene and food safety</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

