import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Users, DollarSign, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Creator Hub + Marketplace + Amplify Hub
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The ultimate platform for creators to share, monetize, and amplify their content.
            Connect with your audience, build your community, and grow your business.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Community Building</CardTitle>
              <CardDescription>
                Connect with like-minded creators and build lasting relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Live chat and Q&A sessions</li>
                <li>• Creator groups and communities</li>
                <li>• Real-time collaboration tools</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <DollarSign className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Monetization</CardTitle>
              <CardDescription>
                Multiple revenue streams to maximize your earning potential
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Paid content and subscriptions</li>
                <li>• Digital product marketplace</li>
                <li>• Flexible pricing tiers</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Content Amplification</CardTitle>
              <CardDescription>
                Powerful tools to reach and engage your target audience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Advanced analytics and insights</li>
                <li>• Cross-platform content sharing</li>
                <li>• Audience growth strategies</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Creative Journey?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of creators who are already building their success story
          </p>
          <Link href="/auth/register">
            <Button size="lg" variant="secondary">
              Start Your Journey Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}