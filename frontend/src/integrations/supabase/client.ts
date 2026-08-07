import { io } from 'socket.io-client';
import { SOCKET_URL, apiUrl } from '@/lib/api-config';

const getStorageItem = (key: string) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

const setStorageItem = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
};

const removeStorageItem = (key: string) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
};

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

const mapAuthUser = (user: any) => ({
  id: user._id || user.id,
  email: user.email,
  user_metadata: {
    role: user.role,
    full_name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
  },
});

const persistUser = (user: any, role?: string) => {
  setStorageItem('user', JSON.stringify(user));
  setStorageItem('userId', user._id || user.id);
  setStorageItem('userRole', role || user.role);
};

const clearUser = () => {
  removeStorageItem('token');
  removeStorageItem('user');
  removeStorageItem('userId');
  removeStorageItem('userRole');
};

const apiFetch = async (path: string, options: any = {}) => {
  const url = apiUrl(path);
  let res: Response;

  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...getHeaders(),
        ...options.headers
      }
    });
  } catch {
    throw new Error(
      'Cannot reach the MediConsult API. Start the backend with: cd backend && npm run dev'
    );
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const validationMsg = errorData.errors?.[0]?.message;
    throw new Error(validationMsg || errorData.message || `API error: ${res.statusText}`);
  }
  return res.json();
};

class CustomSupabaseQueryBuilder {
  table: string;
  filters: any[] = [];
  updates: any = null;
  inserts: any = null;
  deletes: boolean = false;
  orders: any[] = [];
  limits: number | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = "*") {
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ type: 'in', field, values });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ type: 'neq', field, value });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ type: 'gte', field, value });
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push({ type: 'lte', field, value });
    return this;
  }

  order(field: string, options?: any) {
    this.orders.push({ field, options });
    return this;
  }

  limit(count: number) {
    this.limits = count;
    return this;
  }

  maybeSingle() {
    this.limits = 1;
    return this;
  }

  single() {
    this.limits = 1;
    return this;
  }

  insert(data: any) {
    this.inserts = data;
    return this;
  }

  update(data: any) {
    this.updates = data;
    return this;
  }

  delete() {
    this.deletes = true;
    return this;
  }

  async then(resolve: any, reject: any) {
    try {
      const res = await this.execute();
      if (resolve) resolve({ data: res, error: null });
    } catch (err: any) {
      if (resolve) resolve({ data: null, error: err });
    }
  }

  async execute() {
    // DOCTORS TABLE
    if (this.table === 'doctors') {
      const meId = getStorageItem('userId');
      const idFilter = this.filters.find(f => f.field === 'id');

      if (this.updates) {
        const body: any = {};
        if (this.updates.full_name !== undefined) {
          const parts = this.updates.full_name.trim().split(/\s+/);
          body.firstName = parts[0] || '';
          body.lastName = parts.slice(1).join(' ') || '';
        }
        if (this.updates.specialty !== undefined) body.specialization = this.updates.specialty;
        if (this.updates.bio !== undefined) body.bio = this.updates.bio;
        if (this.updates.experienceYears !== undefined) body.experienceYears = Number(this.updates.experienceYears);
        if (this.updates.consultation_fee_cents !== undefined) {
          body.consultationFee = Number(this.updates.consultation_fee_cents) / 100;
        }
        if (this.updates.is_available !== undefined) body.isAvailable = this.updates.is_available;
        if (this.updates.phone !== undefined) body.phone = this.updates.phone;

        const raw = await apiFetch('/auth/me', {
          method: 'PATCH',
          body: JSON.stringify(body)
        });
        const user = raw.data?.user;
        if (user) {
          persistUser(user);
          supabase.triggerAuthChange('SIGNED_IN', { user: mapAuthUser(user) });
        }
        
        return {
          id: user?._id || user?.id || idFilter?.value || meId,
          full_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          specialty: user?.specialization || 'General Practitioner',
          bio: user?.bio || '',
          years_experience: user.experienceYears || 5,
          consultation_fee_cents: (user?.consultationFee || 500) * 100,
          urgent_fee_cents: (user?.urgentFee || 5000) * 100,
          is_available: user?.isAvailable !== undefined ? user.isAvailable : true,
          profiles: {
            id: user?._id || user?.id,
            full_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
          }
        };
      }

      if (idFilter && idFilter.type === 'eq' && idFilter.value === meId && this.limits === 1) {
        const cachedUserStr = getStorageItem('user');
        const user = cachedUserStr ? JSON.parse(cachedUserStr) : null;
        if (user) {
          return {
            id: user._id || user.id,
            full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            specialty: user.specialization || 'General Practitioner',
            bio: user.bio || '',
            years_experience: user.experienceYears || 5,
            consultation_fee_cents: (user.consultationFee || 500) * 100,
            urgent_fee_cents: (user.urgentFee || 5000) * 100,
            is_available: user.isAvailable !== undefined ? user.isAvailable : true,
            profiles: {
              id: user._id || user.id,
              full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
            }
          };
        }
      }

      const raw = await apiFetch('/doctors');
      const docs = raw.data?.doctors || [];
      const mapped = docs.map((doc: any) => ({
        id: doc._id,
        full_name: `${doc.firstName || 'Doctor'} ${doc.lastName || ''}`.trim(),
        specialty: doc.specialization,
        bio: doc.bio || '',
        years_experience: doc.experienceYears || 5,
        consultation_fee_cents: (doc.consultationFee || 500) * 100,
        urgent_fee_cents: (doc.urgentFee || 5000) * 100,
        is_available: doc.isAvailable,
        phone: doc.phone || '',
        profiles: {
          id: doc._id,
          full_name: `${doc.firstName || 'Doctor'} ${doc.lastName || ''}`.trim()
        }
      }));
      let filtered = mapped;
      for (const f of this.filters) {
        if (f.type === 'eq') {
          filtered = filtered.filter((x: any) => x[f.field] === f.value);
        }
      }
      return this.limits === 1 ? filtered[0] || null : filtered;
    }

    // PROFILES TABLE
    if (this.table === 'profiles') {
      const meId = getStorageItem('userId');
      const idFilter = this.filters.find(f => f.field === 'id');

      if (this.updates) {
        const body: any = {};
        if (this.updates.full_name !== undefined) {
          const parts = this.updates.full_name.trim().split(/\s+/);
          body.firstName = parts[0] || '';
          body.lastName = parts.slice(1).join(' ') || '';
        }
        if (this.updates.phone !== undefined) body.phone = this.updates.phone;
        if (this.updates.gender !== undefined) body.gender = this.updates.gender;
        if (this.updates.age !== undefined) {
          body.dateOfBirth = new Date(new Date().getFullYear() - Number(this.updates.age), 0, 1).toISOString();
        }

        const raw = await apiFetch('/auth/me', {
          method: 'PATCH',
          body: JSON.stringify(body)
        });
        const user = raw.data?.user;
        if (user) {
          persistUser(user);
          supabase.triggerAuthChange('SIGNED_IN', { user: mapAuthUser(user) });
        }

        const dob = user?.dateOfBirth;
        let ageVal = 30;
        if (dob) {
          ageVal = new Date().getFullYear() - new Date(dob).getFullYear();
        }

        return {
          id: user?._id || user?.id || idFilter?.value || meId,
          full_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          role: user?.role || 'patient',
          phone: user?.phone || '',
          age: ageVal,
          gender: user?.gender || 'male'
        };
      }
      
      if (idFilter && idFilter.type === 'eq' && idFilter.value === meId) {
        const cachedUserStr = getStorageItem('user');
        const user = cachedUserStr ? JSON.parse(cachedUserStr) : null;
        if (user) {
          const dob = user.dateOfBirth;
          let ageVal = 30;
          if (dob) {
            ageVal = new Date().getFullYear() - new Date(dob).getFullYear();
          }
          return {
            id: user._id || user.id,
            full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            role: user.role,
            phone: user.phone || '',
            age: ageVal,
            gender: user.gender || 'male'
          };
        }
      }
      
      if (idFilter && idFilter.type === 'in') {
        const ids = idFilter.values;
        const profilesList = [];
        for (const uid of ids) {
          const name = getStorageItem(`profile_name_${uid}`) || 'Patient';
          const gender = getStorageItem(`profile_gender_${uid}`) || 'male';
          profilesList.push({
            id: uid,
            full_name: name,
            phone: '+919123456789',
            age: 29,
            gender: gender
          });
        }
        return profilesList;
      }
      
      return [];
    }

    // APPOINTMENTS TABLE
    if (this.table === 'appointments') {
      if (this.deletes) {
        const idFilter = this.filters.find(f => f.field === 'id');
        if (idFilter) {
          const raw = await apiFetch(`/appointments/${idFilter.value}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason: 'Cancelled by patient' })
          });
          return raw.data?.appointment;
        }
        return null;
      }

      if (this.inserts) {
        const isUrgent = this.inserts.appointment_type === 'urgent';
        if (isUrgent) {
          const raw = await apiFetch('/appointments/urgent/initiate', {
            method: 'POST',
            body: JSON.stringify({
              symptoms: this.inserts.symptoms || 'Urgent consultation requested',
              severity: 'high',
              contactPhone: this.inserts.contact_phone || '+1234567890'
            })
          });
          setStorageItem(`payment_data_${raw.data.payment._id}`, JSON.stringify(raw.data));
          return {
            id: raw.data.payment._id,
            appointment_type: 'urgent',
            status: 'pending_payment',
            payment_status: 'unpaid',
            fee_cents: raw.data.payment?.amount || this.inserts.fee_cents
          };
        } else {
          const raw = await apiFetch('/appointments/normal', {
            method: 'POST',
            body: JSON.stringify({
              doctorId: this.inserts.doctor_id,
              symptoms: this.inserts.symptoms || 'Regular consultation',
              severity: 'medium',
              scheduledAt: this.inserts.scheduled_at,
              contactPhone: this.inserts.contact_phone || '+1234567890'
            })
          });
          const apt = raw.data?.appointment;
          return {
            id: apt._id,
            patient_id: apt.patient,
            doctor_id: apt.doctor,
            appointment_type: 'normal',
            status: 'scheduled',
            scheduled_at: apt.scheduledAt
          };
        }
      }

      if (this.updates) {
        const idFilter = this.filters.find(f => f.field === 'id');
        if (idFilter) {
          let statusValue = this.updates.status;
          if (statusValue === 'scheduled') {
            statusValue = 'confirmed';
          }
          const body: any = {};
          if (statusValue) body.status = statusValue;
          if (this.updates.doctorApproved !== undefined) {
            body.doctorApproved = this.updates.doctorApproved;
          }
          const raw = await apiFetch(`/appointments/${idFilter.value}/status`, {
            method: 'PATCH',
            body: JSON.stringify(body)
          });
          const apt = raw.data?.appointment;
          return {
            id: apt._id,
            patient_id: apt.patient,
            doctor_id: apt.doctor,
            appointment_type: apt.type,
            status: apt.status === 'confirmed' ? 'scheduled' : apt.status,
            scheduled_at: apt.scheduledAt,
            doctorApproved: apt.doctorApproved || false
          };
        }
        return null;
      }

      const idFilter = this.filters.find(f => f.field === 'id');
      if (idFilter && idFilter.type === 'eq' && this.limits === 1) {
        try {
          const raw = await apiFetch(`/appointments/${idFilter.value}`);
          const apt = raw.data?.appointment;
          if (!apt) return null;
          if (apt.patient) {
            setStorageItem(`profile_name_${apt.patient._id}`, `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim());
            setStorageItem(`profile_gender_${apt.patient._id}`, apt.patient.gender || 'male');
          }
          return {
            id: apt._id,
            patient_id: apt.patient?._id || apt.patient,
            doctor_id: apt.doctor?._id || apt.doctor,
            status: apt.status === 'confirmed' ? 'scheduled' : apt.status,
            appointment_type: apt.type,
            symptoms: apt.symptoms,
            severity: apt.severity,
            scheduled_at: apt.scheduledAt || apt.createdAt,
            payment_status: apt.status === 'pending_payment' ? 'pending' : 'paid',
            zoom_link: apt.jitsi?.meetingUrl || '',
            fee_cents: (apt.doctor?.consultationFee || 500) * 100,
            healthMetrics: apt.healthMetrics || undefined,
            doctorApproved: apt.doctorApproved || false
          };
        } catch {
          try {
            const rawPay = await apiFetch(`/payments/${idFilter.value}`);
            const payment = rawPay.data;
            if (payment) {
              return {
                id: payment._id,
                appointment_type: payment.metadata?.appointmentType || 'urgent',
                payment_status: payment.status === 'completed' ? 'paid' : 'unpaid',
                status: 'pending_payment',
                fee_cents: payment.amount || 4999
              };
            }
          } catch {}
          return null;
        }
      }

      const raw = await apiFetch('/appointments?limit=100');
      const appts = raw.data?.appointments || [];
      const mapped = appts.map((apt: any) => {
        if (apt.patient?._id) {
          setStorageItem(`profile_name_${apt.patient._id}`, `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim());
          setStorageItem(`profile_gender_${apt.patient._id}`, apt.patient.gender || 'male');
        }
        return {
          id: apt._id,
          patient_id: apt.patient?._id || apt.patient,
          doctor_id: apt.doctor?._id || apt.doctor,
          status: apt.status === 'confirmed' ? 'scheduled' : apt.status,
          appointment_type: apt.type,
          symptoms: apt.symptoms,
          severity: apt.severity,
          scheduled_at: apt.scheduledAt || apt.createdAt,
          payment_status: apt.status === 'pending_payment' ? 'pending' : 'paid',
          zoom_link: apt.jitsi?.meetingUrl || '',
          fee_cents: (apt.doctor?.consultationFee || 500) * 100,
          healthMetrics: apt.healthMetrics || undefined,
          doctorApproved: apt.doctorApproved || false
        };
      });

      let filtered = mapped;
      for (const f of this.filters) {
        if (f.type === 'eq') {
          filtered = filtered.filter((x: any) => x[f.field] === f.value);
        } else if (f.type === 'neq') {
          filtered = filtered.filter((x: any) => x[f.field] !== f.value);
        } else if (f.type === 'in') {
          filtered = filtered.filter((x: any) => f.values.includes(x[f.field]));
        } else if (f.type === 'gte') {
          filtered = filtered.filter((x: any) => new Date(x[f.field]) >= new Date(f.value));
        } else if (f.type === 'lte') {
          filtered = filtered.filter((x: any) => new Date(x[f.field]) <= new Date(f.value));
        }
      }

      for (const o of this.orders) {
        filtered.sort((a: any, b: any) => {
          const valA = new Date(a[o.field]).getTime() || 0;
          const valB = new Date(b[o.field]).getTime() || 0;
          return o.options?.ascending ? valA - valB : valB - valA;
        });
      }

      if (this.limits) {
        filtered = filtered.slice(0, this.limits);
      }

      return this.limits === 1 ? filtered[0] || null : filtered;
    }

    // DOCTOR SCHEDULES TABLE
    if (this.table === 'doctor_schedules') {
      const doctorIdFilter = this.filters.find((f) => f.field === 'doctor_id');
      const doctorId = doctorIdFilter?.value || getStorageItem('userId');

      if (this.inserts) {
        const raw = await apiFetch('/doctors/portal/schedule', {
          method: 'POST',
          body: JSON.stringify({
            dayOfWeek: Number(this.inserts.day_of_week),
            startTime: this.inserts.start_time,
            endTime: this.inserts.end_time,
            slotMinutes: Number(this.inserts.slot_minutes),
            maxAppointments: this.inserts.max_appointments ? Number(this.inserts.max_appointments) : 10,
          }),
        });
        return raw.data?.slot;
      }

      if (this.deletes) {
        const idFilter = this.filters.find((f) => f.field === 'id');
        if (idFilter) {
          await apiFetch(`/doctors/portal/schedule/${idFilter.value}`, {
            method: 'DELETE',
          });
        }
        return null;
      }

      const schedulePath = doctorId
        ? `/doctors/${doctorId}/schedule`
        : '/doctors/portal/schedule';
      const raw = await apiFetch(schedulePath);
      let filtered = raw.data?.schedule || [];

      for (const f of this.filters) {
        if (f.type === 'eq') {
          filtered = filtered.filter((x: any) => x[f.field] === f.value);
        }
      }

      for (const o of this.orders) {
        filtered.sort((a: any, b: any) => {
          const valA = a[o.field] ?? '';
          const valB = b[o.field] ?? '';
          if (o.field === 'start_time') {
            return o.options?.ascending
              ? valA.localeCompare(valB)
              : valB.localeCompare(valA);
          }
          return o.options?.ascending ? valA - valB : valB - valA;
        });
      }

      return filtered;
    }

    // NOTIFICATIONS TABLE
    if (this.table === 'notifications') {
      if (this.updates) {
        const idFilter = this.filters.find(f => f.field === 'id');
        if (idFilter) {
          const raw = await apiFetch(`/notifications/${idFilter.value}/read`, { method: 'PATCH' });
          return raw.data?.notification;
        }
        return null;
      }

      // Handle is_read filter
      const isReadFilter = this.filters.find(f => f.field === 'is_read');
      let url = '/notifications?limit=50';
      if (isReadFilter && isReadFilter.value === false) {
        url += '&unreadOnly=true';
      }

      const raw = await apiFetch(url);
      const notifications = raw.data?.notifications || [];
      const mapped = notifications.map((n: any) => ({
        id: n._id,
        user_id: n.recipient,
        title: n.title,
        message: n.message,
        is_read: n.isRead,
        is_urgent: n.type === 'urgent_appointment' || n.data?.type === 'urgent',
        created_at: n.createdAt,
        appointment_id: n.data?.appointmentId || ''
      }));
      return mapped;
    }

    // USER ROLES TABLE
    if (this.table === 'user_roles') {
      const meId = getStorageItem('userId');
      const cachedRole = getStorageItem('userRole') || 'patient';
      return [{
        user_id: meId,
        role: cachedRole
      }];
    }

    return [];
  }
}

class CustomSupabaseClient {
  listeners: Map<string, any[]> = new Map();
  socket: any = null;
  authListeners: any[] = [];

  constructor() {
    setTimeout(async () => {
      const userStr = getStorageItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        this.triggerAuthChange('SIGNED_IN', { user: mapAuthUser(user) });
      }
    }, 100);
  }

  from(table: string) {
    return new CustomSupabaseQueryBuilder(table);
  }

  triggerAuthChange(event: string, session: any) {
    this.authListeners.forEach(listener => {
      listener(event, session);
    });
  }

  auth = {
    onAuthStateChange: (callback: any) => {
      this.authListeners.push(callback);
      const userStr = getStorageItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user) {
        callback('SIGNED_IN', { user: mapAuthUser(user) });
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authListeners = this.authListeners.filter(l => l !== callback);
            }
          }
        }
      };
    },

    getUser: async () => {
      try {
        // First check localStorage for cached user
        const cachedUserStr = getStorageItem('user');
        if (cachedUserStr) {
          const user = JSON.parse(cachedUserStr);
          return { data: { user: mapAuthUser(user) }, error: null };
        }
        
        // If no cached user, try to fetch from backend
        const res = await apiFetch('/auth/me');
        const user = res.data.user;
        persistUser(user);
        return { data: { user: mapAuthUser(user) }, error: null };
      } catch (err: any) {
        clearUser();
        return { data: { user: null }, error: err };
      }
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      try {
        const res = await apiFetch('/auth/change-password', {
          method: 'PATCH',
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        return { data: res.data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    getSession: async () => {
      const { data, error } = await this.auth.getUser();
      if (error || !data.user) {
        return { data: { session: null }, error };
      }
      return {
        data: {
          session: {
            user: data.user,
          },
        },
        error: null,
      };
    },

    signUp: async ({ email, password, options }: any) => {
      const data = options?.data || {};
      const nameParts = (data.full_name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      const isPatient = data.role === 'patient';
      const endpoint = isPatient ? '/auth/patient/register' : '/auth/doctor/register';

      const payload = isPatient
        ? {
            email,
            password,
            firstName,
            lastName,
            phone: data.phone || '+919123456789',
            gender: data.gender || 'male',
            dateOfBirth: new Date(new Date().getFullYear() - (Number(data.age) || 30), 0, 1).toISOString()
          }
        : {
            email,
            password,
            firstName,
            lastName,
            phone: '+919876543210',
            specialization: data.specialty || 'General Practitioner',
            licenseNumber: 'MCI-2026-' + Math.random().toString(36).substring(7).toUpperCase()
          };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const user = res.data.user;

      persistUser(user);

      this.triggerAuthChange('SIGNED_IN', { user: mapAuthUser(user) });

      return {
        data: { user: mapAuthUser(user) },
        error: null,
      };
    },

    signInWithPassword: async ({ email, password }: any) => {
      let isSuccess = false;
      let res: any;
      let role = 'patient';

      try {
        const raw = await fetch(apiUrl('/auth/patient/login'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (raw.ok) {
          res = await raw.json();
          isSuccess = true;
          role = 'patient';
        }
      } catch {}

      if (!isSuccess) {
        const raw = await fetch(apiUrl('/auth/doctor/login'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (raw.ok) {
          res = await raw.json();
          isSuccess = true;
          role = 'doctor';
        } else {
          const err = await raw.json().catch(() => ({}));
          return { data: { user: null }, error: new Error(err.message || 'Login failed') };
        }
      }

      const user = res.data.user;

      persistUser(user, role);

      this.triggerAuthChange('SIGNED_IN', { user: mapAuthUser(user) });

      return {
        data: { user: mapAuthUser(user) },
        error: null,
      };
    },

    signOut: async () => {
      try {
        await apiFetch('/auth/logout', { method: 'POST' });
      } catch {}
      clearUser();
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      this.triggerAuthChange('SIGNED_OUT', null);
      return { error: null };
    },

    signInWithOAuth: async ({ provider, options }: any) => {
      if (provider !== 'google') {
        return { data: null, error: new Error('Only Google OAuth is supported') };
      }

      const redirectTo = options?.redirectTo || window.location.origin;

      try {
        const res = await apiFetch('/auth/google/url', {
          method: 'POST',
          body: JSON.stringify({ redirectTo })
        });

        if (res.data?.url) {
          window.location.href = res.data.url;
          return { data: { url: res.data.url }, error: null };
        } else {
          return { data: null, error: new Error('Failed to get OAuth URL') };
        }
      } catch (error: any) {
        return { data: null, error: new Error(error.message || 'OAuth failed') };
      }
    }
  };

  channel(channelName: string) {
    const self = this;
    if (typeof window === 'undefined') {
      return {
        on() { return this; },
        subscribe(statusCallback: any) {
          if (statusCallback) statusCallback('SUBSCRIBED');
          return { unsubscribe() {} };
        }
      };
    }

    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, []);
    }

    if (!this.socket) {
      const userId = getStorageItem('userId');
      if (userId) {
        this.socket = io(SOCKET_URL, {
          withCredentials: true,
          transports: ['websocket', 'polling'],
        });

        this.socket.on('urgent:appointment', (payload: any) => {
          console.log('Real-time urgent alert caught:', payload);
          const list = self.listeners.get(channelName) || [];
          list.forEach(lis => {
            if (lis.eventType === 'postgres_changes' && lis.filter.table === 'notifications') {
              lis.callback({
                new: {
                  id: payload.notification?._id || Math.random().toString(),
                  user_id: payload.notification?.recipient,
                  title: payload.notification?.title || '🚨 Urgent Consultation Request',
                  message: payload.notification?.message || 'An urgent case is waiting for you now.',
                  is_read: false,
                  is_urgent: true,
                  created_at: payload.notification?.createdAt || new Date().toISOString()
                },
                eventType: 'INSERT',
                schema: 'public',
                table: 'notifications'
              });
            }
            if (lis.eventType === 'postgres_changes' && lis.filter.table === 'appointments') {
              lis.callback({
                new: {
                  id: payload.appointment?._id || payload.appointment?.id,
                  patient_id: payload.appointment?.patient?.id || payload.appointment?.patient,
                  status: 'scheduled',
                  appointment_type: 'urgent',
                  symptoms: payload.appointment?.symptoms,
                  scheduled_at: payload.appointment?.createdAt || new Date().toISOString()
                },
                eventType: 'INSERT',
                schema: 'public',
                table: 'appointments'
              });
            }
          });
        });
      }
    }

    return {
      on(eventType: string, filter: any, callback: any) {
        const list = self.listeners.get(channelName) || [];
        list.push({ eventType, filter, callback });
        self.listeners.set(channelName, list);
        return this;
      },
      subscribe(statusCallback: any) {
        if (statusCallback) statusCallback('SUBSCRIBED');
        return {
          unsubscribe() {
            self.listeners.delete(channelName);
          }
        };
      }
    };
  }

  removeChannel(ch: any) {
    if (ch && typeof ch.unsubscribe === 'function') {
      ch.unsubscribe();
    }
  }

  async updateDoctorFees({ consultationFee, urgentFee }: { consultationFee?: number; urgentFee?: number }) {
    try {
      const res = await apiFetch('/doctors/portal/fees', {
        method: 'PATCH',
        body: JSON.stringify({ consultationFee, urgentFee }),
      });
      return { data: res.data?.doctor, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async getDoctorProfile() {
    try {
      const res = await apiFetch('/auth/me');
      return { data: res.data?.user, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async reserveSlot(doctorId: string, scheduledAt: string) {
    try {
      const res = await apiFetch('/appointments/reserve', {
        method: 'POST',
        body: JSON.stringify({ doctorId, scheduledAt }),
      });
      return { data: res.data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async releaseReservation(reservationId: string) {
    try {
      await apiFetch(`/appointments/reserve/${reservationId}`, { method: 'DELETE' });
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  }

  async confirmReservation(reservationId: string, symptoms: string, severity = 'medium', cholesterol?: number, sugar?: number, bloodPressure?: string) {
    try {
      const res = await apiFetch('/appointments/reserve/confirm', {
        method: 'POST',
        body: JSON.stringify({ reservationId, symptoms, severity, cholesterol, sugar, bloodPressure }),
      });
      return { data: res.data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async getScheduleCapacity(doctorId: string, dates: string[]) {
    try {
      const res = await apiFetch(`/doctors/${doctorId}/schedule/capacity?dates=${dates.join(',')}`);
      return { data: res.data?.capacity, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async getSlotStatus(doctorId: string, date: string) {
    try {
      const res = await apiFetch(`/doctors/${doctorId}/slots?date=${date}`);
      return { data: res.data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async getPayment(paymentId: string) {
    try {
      const res = await apiFetch(`/payments/${paymentId}`);
      return { data: res.data?.payment, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async getExchangeRate() {
    try {
      const res = await apiFetch('/currency/rate');
      return { data: res.data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  async convertLKRtoUSD(amountLKR: number) {
    try {
      const res = await apiFetch(`/currency/convert?amount=${amountLKR}`);
      return { data: res.data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
}

export const supabase = new CustomSupabaseClient() as any;
export default supabase;
