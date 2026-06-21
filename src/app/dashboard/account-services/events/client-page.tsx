"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Plus, X, Pencil, Trash2, FileText, ArrowLeft, Search, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { createEvent, updateEvent, deleteEvent } from "@/app/actions/events";
import MappingModal from "../../forms/builder/MappingModal";

export default function EventsClientPage({ initialEvents = [], initialTemplates = [] }: { initialEvents?: any[], initialTemplates?: any[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pdfTemplateId, setPdfTemplateId] = useState("");
  const [templateMappings, setTemplateMappings] = useState<Record<string, string>>({});
  const [facilitators, setFacilitators] = useState<{name: string, email: string}[]>([]);
  
  const [mappingModal, setMappingModal] = useState<{
    isOpen: boolean;
    templateId: string;
    fields: any[];
    currentMappings: Record<string, string>;
    onSave: (m: Record<string, string>) => void;
  } | null>(null);

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pdfTemplates, setPdfTemplates] = useState<any[]>(initialTemplates);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [isFetchingAttendees, setIsFetchingAttendees] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);

  React.useEffect(() => {
    if (userQuery.trim().length < 2) {
      setUserResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      setShowResults(true);
      fetch(`/api/v1/forms/search-users?q=${encodeURIComponent(userQuery)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setUserResults(data.data);
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [userQuery]);

  const handleAddFacilitator = (email: string, name?: string) => {
    const finalEmail = email.trim();
    if (!finalEmail) return;
    const finalName = name || finalEmail.split("@")[0];
    
    if (!facilitators.find(f => f.email.toLowerCase() === finalEmail.toLowerCase())) {
      setFacilitators([...facilitators, { name: finalName, email: finalEmail }]);
    }
    setUserQuery("");
    setUserResults([]);
    setShowResults(false);
  };

  const handleRemoveFacilitator = (index: number) => {
    setFacilitators(facilitators.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setPdfTemplateId("");
    setTemplateMappings({});
    setFacilitators([]);
    setIsEditMode(false);
    setEditingEventId(null);
  };

  const handleEdit = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.masterSubmissionId) {
      alert("Cannot edit an event after signatures have been initiated.");
      return;
    }
    setName(event.name);
    setStartDate(event.startDate.split("T")[0]);
    setEndDate(event.endDate.split("T")[0]);
    setPdfTemplateId(event.pdfTemplateId || "");
    setTemplateMappings(
      typeof event.templateMappings === "string" ? JSON.parse(event.templateMappings) : (event.templateMappings || {})
    );
    setFacilitators(event.facilitators || []);
    setIsEditMode(true);
    setEditingEventId(event.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.masterSubmissionId) {
      alert("Cannot delete an event after signatures have been initiated.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the event "${event.name}"?`)) return;

    try {
      const res = await deleteEvent(event.id);
      if (res?.success) {
        setEvents(events.filter(ev => ev.id !== event.id));
      } else {
        alert(res?.error || "Failed to delete event");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;
    setIsSubmitting(true);
    try {
      let res;
      if (isEditMode && editingEventId) {
        res = await updateEvent(editingEventId, { name, startDate, endDate, pdfTemplateId, templateMappings, facilitators });
      } else {
        res = await createEvent({ name, startDate, endDate, pdfTemplateId, templateMappings, facilitators });
      }

      if (res?.success) {
        if (isEditMode) {
          setEvents(events.map(ev => ev.id === editingEventId ? res.event : ev));
        } else {
          setEvents([res.event, ...events]);
        }
        setIsModalOpen(false);
        resetForm();
      } else {
        alert(res?.error || (isEditMode ? "Failed to update event" : "Failed to create event"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEventClick = async (event: any) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
    setIsFetchingAttendees(true);
    try {
      const res = await fetch(`/api/v1/events/${event.id}/attendees`);
      const data = await res.json();
      if (data.success) {
        setAttendees(data.attendees);
      }
    } catch (e) {
      console.error(e);
    }
    setIsFetchingAttendees(false);
  };

  const handleInitiateSignatures = async () => {
    if (!selectedEvent) return;
    setIsInitiating(true);
    try {
      const res = await fetch(`/api/v1/events/${selectedEvent.id}/initiate-signatures`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        const updatedEvent = { ...selectedEvent, masterSubmissionId: data.submissionId };
        setSelectedEvent(updatedEvent);
        setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      } else {
        console.error(data.error || "Failed to initiate signatures");
      }
    } catch (e: any) {
      console.error("Error: " + e.message);
    }
    setIsInitiating(false);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const filteredEvents = events.filter(evt => 
    evt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    evt.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl mx-auto pb-12 space-y-6">
      <Link href="/dashboard/account-services"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />Extended Services
      </Link>

      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white rounded-2xl px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <h2 className="text-2xl font-bold">Events Management</h2>
          <p className="text-sm text-white/70 mt-1">Create and manage training events and collection of facilitator signatures.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50 transition-colors">
            <Plus className="w-4 h-4" />New Event
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name or reference..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-900 text-white text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 font-semibold">Reference</th>
                <th className="px-6 py-4 font-semibold">Event Name</th>
                <th className="px-6 py-4 font-semibold">Start Date</th>
                <th className="px-6 py-4 font-semibold">End Date</th>
                <th className="px-6 py-4 font-semibold">Document</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="font-medium">{searchTerm ? "No events match your search" : "No events found"}</p>
                    {!searchTerm && <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="mt-1 text-primary text-sm hover:underline">Create your first event →</button>}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt: any) => (
                <tr 
                  key={evt.id} 
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => handleEventClick(evt)}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">{evt.reference}</td>
                  <td className="px-6 py-4">
                    {evt.name}
                    {evt.masterSubmissionId && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Signed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">{new Date(evt.startDate).toLocaleString()}</td>
                  <td className="px-6 py-4">{new Date(evt.endDate).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {evt.pdfTemplateId ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (evt.masterSubmissionId) {
                            window.open(`/api/v1/pdf?id=${evt.masterSubmissionId}&action=print`, "_blank");
                          } else {
                            window.open(`/api/v1/events/${evt.id}/preview-pdf`, "_blank");
                          }
                        }}
                        className="p-1.5 text-primary hover:text-primary/80 hover:bg-amber-50 rounded transition-colors"
                        title={evt.masterSubmissionId ? "View Final Document" : "Preview Current Roster"}
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                    ) : (
                      <span className="text-gray-400 italic">No template</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => handleEdit(evt, e)}
                        disabled={!!evt.masterSubmissionId}
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-amber-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Edit Event"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(evt, e)}
                        disabled={!!evt.masterSubmissionId}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{isEditMode ? "Edit Event" : "Create New Event"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                  placeholder="e.g. Q3 Compliance Training"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">PDF Template (Optional)</label>
                <select
                  value={pdfTemplateId}
                  onChange={(e) => setPdfTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                >
                  <option value="">-- No Document Generation --</option>
                  {pdfTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">This template will be used to generate the final event document.</p>
                  {pdfTemplateId && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/v1/templates/${pdfTemplateId}/fields`);
                          const data = await res.json();
                          if (data.success) {
                            setMappingModal({
                              isOpen: true,
                              templateId: pdfTemplateId,
                              fields: data.data || [],
                              currentMappings: templateMappings || {},
                              onSave: (newMappings) => setTemplateMappings(newMappings)
                            });
                          }
                        } catch (err) {
                          console.error("Failed to load fields", err);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-300 shadow-sm rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <MapIcon className="w-3.5 h-3.5 text-primary" />
                      Map Variables ({Object.keys(templateMappings || {}).length})
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Facilitator / Approver(s)</label>
                
                {facilitators.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {facilitators.map((fac, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{fac.name}</p>
                          <p className="text-xs text-gray-500">{fac.email}</p>
                        </div>
                        <button type="button" onClick={() => handleRemoveFacilitator(i)} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative flex items-start gap-2">
                  <div className="flex-1">
                    <input
                      type="email"
                      placeholder="Type email to search or add..."
                      value={userQuery}
                      onChange={(e) => {
                        setUserQuery(e.target.value);
                        setShowResults(true);
                      }}
                      onBlur={() => setTimeout(() => setShowResults(false), 200)}
                      onFocus={() => { if (userQuery.length >= 2) setShowResults(true); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
                    />
                    
                    {/* Autocomplete Dropdown */}
                    {showResults && (isSearching || userResults.length > 0) && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {isSearching ? (
                          <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
                        ) : (
                          userResults.map((u: any) => (
                            <button
                              key={u.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault(); // prevent blur
                                handleAddFacilitator(u.finca_email, u.user_name);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex flex-col items-start border-b border-gray-50 last:border-0"
                            >
                              <span className="text-sm font-medium text-gray-900">{u.finca_email}</span>
                              <span className="text-xs text-gray-500">{u.user_name} • {u.branch || "No Branch"}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddFacilitator(userQuery)}
                    disabled={!userQuery.includes("@")}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? "Saving..." : (isEditMode ? "Update Event" : "Create Event")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {isDetailModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedEvent.name}</h3>
                <p className="text-sm text-gray-500">{selectedEvent.reference} • {new Date(selectedEvent.startDate).toLocaleDateString()} - {new Date(selectedEvent.endDate).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">Event Roster (Attendees)</h4>
                
                {selectedEvent.masterSubmissionId ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Signature Collection Initiated
                  </span>
                ) : (
                  <button
                    onClick={handleInitiateSignatures}
                    disabled={isInitiating || attendees.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isInitiating ? "Initiating..." : "Collect Facilitator Signatures"}
                  </button>
                )}
              </div>

              {isFetchingAttendees ? (
                <div className="py-12 text-center text-gray-500">Loading attendees...</div>
              ) : attendees.length === 0 ? (
                <div className="py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg">
                  No attendees have submitted forms for this event yet.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {attendees.map((att: any) => (
                        <tr key={att.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{att.name}</td>
                          <td className="px-4 py-3">{att.email}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {att.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{new Date(att.date).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* User Search Dropdown ... (unchanged) */}
      
      {mappingModal && (
        <MappingModal
          isOpen={mappingModal.isOpen}
          onClose={() => setMappingModal(null)}
          pdfTemplateId={mappingModal.templateId}
          pdfFields={mappingModal.fields}
          currentMappings={mappingModal.currentMappings}
          onSave={mappingModal.onSave}
          formFields={[]} // Events do not have form questions
        />
      )}
    </div>
  );
}
