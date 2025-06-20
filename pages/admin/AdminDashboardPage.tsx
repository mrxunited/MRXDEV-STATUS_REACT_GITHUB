

import React, { useState, useEffect } from 'react'; 
import InternalSystemStatusSection from '../../components/admin/dashboard/sections/SystemStatusSection';
import ActivityLogSection from '../../components/admin/dashboard/sections/ActivityLogSection';
import InternalUptimeSection from '../../components/admin/dashboard/sections/UptimeSection';
import ErrorsSection from '../../components/admin/dashboard/sections/ErrorsSection';
import Card from '../../components/ui/Card';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; 
import { adminGetAllIncidents, adminGetAllIncidentReviews } from '../../services/appwrite'; 
import { Incident, PIRStatus, IncidentLifecycleStatus, IncidentType } from '../../types'; 
import LoadingSpinner from '../../components/ui/LoadingSpinner'; 


const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [isLoadingPendingReviews, setIsLoadingPendingReviews] = useState(true);

  useEffect(() => {
    const fetchPendingReviews = async () => {
      setIsLoadingPendingReviews(true);
      try {
        const resolvedIncidents = await adminGetAllIncidents({
          status: IncidentLifecycleStatus.RESOLVED, 
          type: IncidentType.INCIDENT, 
        });
        const completedMaintenance = await adminGetAllIncidents({
          status: IncidentLifecycleStatus.COMPLETED,
          type: IncidentType.MAINTENANCE, 
        });
        
        const allRelevantIncidents = [...resolvedIncidents, ...completedMaintenance];
        
        if (allRelevantIncidents.length === 0) {
          setPendingReviewsCount(0);
          setIsLoadingPendingReviews(false);
          return;
        }

        const allReviews = await adminGetAllIncidentReviews();
        const reviewsMap = new Map(allReviews.map(review => [review.incidentId, review]));

        let pendingCount = 0;
        for (const incident of allRelevantIncidents) {
          const review = reviewsMap.get(incident.id);
          if (!review || review.status === PIRStatus.PENDING) {
            // If debriefRequired is true, it's definitely pending.
            // Otherwise, it's pending if no review exists or review is in PENDING state.
            if (incident.debriefRequired || !review || review.status === PIRStatus.PENDING) {
                 pendingCount++;
            }
          }
        }
        setPendingReviewsCount(pendingCount);

      } catch (error) {
        console.error("Failed to fetch pending reviews count:", error);
        setPendingReviewsCount(0); 
      } finally {
        setIsLoadingPendingReviews(false);
      }
    };

    fetchPendingReviews();
  }, []);


  return (
    <div className="space-y-6"> 
      <Card title="Public Status Page Management" titleIcon="fa-bullhorn">
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4">
          Manage the content displayed on the public status page. Update service statuses, post incident reports, and schedule maintenance notifications.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link 
            to="/admin/services" 
            className="block p-4 bg-[var(--color-primary-blue)] text-white rounded-lg hover:bg-[var(--color-primary-blue-hover)] transition-colors shadow hover:shadow-md"
          >
            <div className="flex items-center">
              <i className="fas fa-stream fa-2x mr-4"></i>
              <div>
                <h3 className="text-lg font-semibold">Manage Services</h3>
                <p className="text-sm opacity-90">Define and update public services.</p>
              </div>
            </div>
          </Link>
          <Link 
            to="/admin/incidents" 
            className="block p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow hover:shadow-md"
          >
            <div className="flex items-center">
              <i className="fas fa-bolt fa-2x mr-4"></i>
              <div>
                <h3 className="text-lg font-semibold">Manage Incidents</h3>
                <p className="text-sm opacity-90">Report incidents and maintenance.</p>
              </div>
            </div>
          </Link>
          <Link 
            to="/admin/reviews" 
            className="block p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow hover:shadow-md"
          >
            <div className="flex items-center">
              <i className="fas fa-clipboard-check fa-2x mr-4"></i>
              <div>
                <h3 className="text-lg font-semibold">De-Briefs</h3>
                <p className="text-sm opacity-90">Manage Post-Incident De-Briefs.</p>
              </div>
            </div>
          </Link>
        </div>
      </Card>

      {isLoadingPendingReviews ? (
        <Card title="Pending De-Briefs" titleIcon="fa-hourglass-half">
            <div className="flex items-center justify-center p-4">
                <LoadingSpinner size="sm" /> 
                <span className="ml-2 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">Loading de-brief status...</span>
            </div>
        </Card>
      ) : pendingReviewsCount > 0 && (
        <Card title="Action Required: Pending Incident De-Briefs" titleIcon="fa-exclamation-triangle" className="border-yellow-400 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex items-center justify-between">
                <p className="text-yellow-700 dark:text-yellow-300">
                    You have <strong className="font-bold">{pendingReviewsCount}</strong> incident(s) pending post-incident de-brief.
                </p>
                <Link 
                    to="/admin/reviews?pirStatus=Pending%20Review" 
                    className="px-3 py-1.5 text-xs font-medium bg-yellow-500 hover:bg-yellow-600 text-white rounded-md shadow-sm"
                >
                    View Pending De-Briefs
                </Link>
            </div>
        </Card>
      )}


      {user?.role === 'Admin' && (
        <Card title="Administration Tools" titleIcon="fa-tools">
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4">
            Access tools for managing users and system access.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              to="/admin/users" 
              className="block p-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow hover:shadow-md"
            >
              <div className="flex items-center">
                <i className="fas fa-users-cog fa-2x mr-4"></i>
                <div>
                  <h3 className="text-lg font-semibold">User Management</h3>
                  <p className="text-sm opacity-90">Manage admin and support accounts.</p>
                </div>
              </div>
            </Link>
            <Link 
              to="/admin/api-keys" 
              className="block p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow hover:shadow-md"
            >
              <div className="flex items-center">
                <i className="fas fa-key fa-2x mr-4"></i>
                <div>
                  <h3 className="text-lg font-semibold">API Key Management</h3>
                  <p className="text-sm opacity-90">Generate and revoke API keys.</p>
                </div>
              </div>
            </Link>
          </div>
        </Card>
      )}

      <h2 className="text-xl font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] pt-4 border-t mt-8 border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">Internal Monitoring</h2>
      <InternalSystemStatusSection />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InternalUptimeSection />
        <ErrorsSection />
      </div>
      
      <ActivityLogSection />
    </div>
    
  );
};

export default AdminDashboardPage;
