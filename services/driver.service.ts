import {
  AddVehicleFormData,
  BecomeDriverFormData,
  DriverApplicationStatus,
  DriverProfile,
  UpdateDriverProfileData,
  Vehicle,
} from "@/interfaces/driver";
import { supabase } from "@/lib/supabase";
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { discordService } from "@/services/discord.service";

export const driverService = {
  /**
   * Uploads a document/photo to a Supabase Storage bucket.
   */
  async uploadDocument(fileUri: string, bucket: string, path: string): Promise<string> {
    if (!fileUri) return "";

    // If it's already a remote URL, return directly
    if (fileUri.startsWith("http://") || fileUri.startsWith("https://")) {
      return fileUri;
    }

    try {
      const fileExt = fileUri.split(".").pop()?.toLowerCase() || "jpg";
      const fullPath = `${path}_${Date.now()}.${fileExt}`;

      // 1. Leer el archivo local como string en Base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 2. Subir a Supabase decodificando el Base64 a ArrayBuffer
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fullPath, decode(base64), {
          contentType: `image/${fileExt === "png" ? "png" : "jpeg"}`,
          upsert: true,
        });

      if (error) {
        console.error(`[driverService.uploadDocument] Error uploading to ${bucket}:`, error.message);
        return fileUri;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl || data.path;
    } catch (err: any) {
      console.warn(`[driverService.uploadDocument] Storage upload warning:`, err.message);
      return fileUri;
    }
  },

  /**
   * Submits initial driver registration profile and initial vehicle via RPC function `submit_driver_application`.
   */
  async submitDriverApplication(userId: string, formData: BecomeDriverFormData): Promise<any> {
    // 1. Upload license image
    let licenseImageUrl = "";
    if (formData.license_image_uri) {
      licenseImageUrl = await this.uploadDocument(
        formData.license_image_uri,
        "driver-documents",
        `${userId}/license`
      );
    }

    // 2. Upload registration document
    let registrationDocUrl = "";
    if (formData.registration_doc_uri) {
      registrationDocUrl = await this.uploadDocument(
        formData.registration_doc_uri,
        "vehicle-documents",
        `${userId}/registration`
      );
    }

    // 3. Upload vehicle photo (optional)
    let vehicleImageUrl: string | null = null;
    if (formData.vehicle_image_uri) {
      vehicleImageUrl = await this.uploadDocument(
        formData.vehicle_image_uri,
        "vehicle-images",
        `${userId}/vehicle`
      );
    }

    // 4. Call Supabase RPC 'submit_driver_application'
    const payload = {
      p_user_id: userId,
      p_license_number: formData.license_number.trim(),
      p_license_expiration_date: formData.license_expiration_date || null,
      p_license_image_url: licenseImageUrl,
      p_brand: formData.brand.trim(),
      p_model: formData.model.trim(),
      p_year: parseInt(formData.year as string, 10) || new Date().getFullYear(),
      p_plate: formData.plate.toUpperCase().trim(),
      p_color: formData.color.trim(),
      p_seats_capacity: Number(formData.seats_capacity) || 4,
      p_registration_doc_url: registrationDocUrl,
      p_vehicle_image_url: vehicleImageUrl,
    };

    const { data, error } = await supabase.rpc("submit_driver_application", payload);

    if (error) {
      console.error("[driverService.submitDriverApplication] RPC Error:", error.message);
      if (error.message?.includes("vehicles_plate_key") || error.message?.includes("registrada")) {
        throw new Error("La placa ingresada ya se encuentra registrada en el sistema por otro usuario.");
      }
      throw new Error(error.message || "Error al enviar la solicitud de conductor.");
    }

    // 5. Notificar a Discord Webhook (Función estándar en cliente)
    discordService.sendDriverApplicationToDiscord({
      userId,
      licenseNumber: formData.license_number.trim(),
      licenseExpirationDate: formData.license_expiration_date || null,
      licenseImageUrl,
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      year: parseInt(formData.year as string, 10) || new Date().getFullYear(),
      plate: formData.plate.toUpperCase().trim(),
      color: formData.color.trim(),
      seatsCapacity: Number(formData.seats_capacity) || 4,
      registrationDocUrl,
      vehicleImageUrl,
      isUpdate: false,
    }).catch((err) => console.error("[submitDriverApplication] Error en Discord notification:", err));

    return data;
  },

  /**
   * Updates driver profile/vehicle data and resets status to 'pending' for administrative re-verification.
   */
  async updateDriverProfileForReverification(
    userId: string,
    formData: UpdateDriverProfileData
  ): Promise<any> {
    let licenseImageUrl = undefined;
    if (formData.license_image_uri) {
      licenseImageUrl = await this.uploadDocument(
        formData.license_image_uri,
        "driver-documents",
        `${userId}/license`
      );
    }

    let registrationDocUrl = undefined;
    if (formData.registration_doc_uri) {
      registrationDocUrl = await this.uploadDocument(
        formData.registration_doc_uri,
        "vehicle-documents",
        `${userId}/registration`
      );
    }

    let vehicleImageUrl = undefined;
    if (formData.vehicle_image_uri) {
      vehicleImageUrl = await this.uploadDocument(
        formData.vehicle_image_uri,
        "vehicle-images",
        `${userId}/vehicle`
      );
    }

    const payload = {
      p_user_id: userId,
      p_license_number: formData.license_number.trim(),
      p_license_expiration_date: formData.license_expiration_date || null,
      p_license_image_url: licenseImageUrl || null,
      p_vehicle_id: formData.vehicle_id || null,
      p_brand: formData.brand ? formData.brand.trim() : null,
      p_model: formData.model ? formData.model.trim() : null,
      p_year: formData.year ? parseInt(formData.year, 10) : null,
      p_plate: formData.plate ? formData.plate.toUpperCase().trim() : null,
      p_color: formData.color ? formData.color.trim() : null,
      p_seats_capacity: formData.seats_capacity ? Number(formData.seats_capacity) : null,
      p_registration_doc_url: registrationDocUrl || null,
      p_vehicle_image_url: vehicleImageUrl || null,
    };

    console.warn("PAYLOAD: ", JSON.stringify(payload, null, 2));
    const { data, error } = await supabase.rpc("update_driver_profile_for_reverification", payload);

    console.warn("DATA: ", JSON.stringify(data, null, 2));
    console.warn("ERROR: ", JSON.stringify(error, null, 2));

    if (error) {
      console.error("[driverService.updateDriverProfileForReverification] RPC Error:", error.message);
      if (error.message?.includes("vehicles_plate_key") || error.message?.includes("registrada")) {
        throw new Error("La placa ingresada ya pertenece a otro vehículo registrado.");
      }
      throw new Error(error.message || "Error al actualizar los datos del conductor.");
    }

    // 5. Notificar actualización a Discord Webhook (Función estándar en cliente)
    discordService.sendDriverApplicationToDiscord({
      userId,
      licenseNumber: formData.license_number.trim(),
      licenseExpirationDate: formData.license_expiration_date || null,
      licenseImageUrl: licenseImageUrl || undefined,
      brand: formData.brand ? formData.brand.trim() : "",
      model: formData.model ? formData.model.trim() : "",
      year: formData.year ? parseInt(formData.year, 10) : new Date().getFullYear(),
      plate: formData.plate ? formData.plate.toUpperCase().trim() : "",
      color: formData.color ? formData.color.trim() : "",
      seatsCapacity: formData.seats_capacity ? Number(formData.seats_capacity) : 4,
      registrationDocUrl: registrationDocUrl || undefined,
      vehicleImageUrl: vehicleImageUrl || undefined,
      isUpdate: true,
    }).catch((err) => console.error("[updateDriverProfileForReverification] Error en Discord notification:", err));

    return data;
  },

  /**
   * Adds an additional vehicle for an existing driver user (1:N relationship).
   */
  async addNewVehicle(userId: string, formData: AddVehicleFormData): Promise<any> {
    let registrationDocUrl = "";
    if (formData.registration_doc_uri) {
      registrationDocUrl = await this.uploadDocument(
        formData.registration_doc_uri,
        "vehicle-documents",
        `${userId}/registration`
      );
    }

    let vehicleImageUrl: string | null = null;
    if (formData.vehicle_image_uri) {
      vehicleImageUrl = await this.uploadDocument(
        formData.vehicle_image_uri,
        "vehicle-images",
        `${userId}/vehicle`
      );
    }

    const payload = {
      p_user_id: userId,
      p_brand: formData.brand.trim(),
      p_model: formData.model.trim(),
      p_year: parseInt(formData.year, 10) || new Date().getFullYear(),
      p_plate: formData.plate.toUpperCase().trim(),
      p_color: formData.color.trim(),
      p_seats_capacity: Number(formData.seats_capacity) || 4,
      p_registration_doc_url: registrationDocUrl,
      p_vehicle_image_url: vehicleImageUrl,
      p_set_as_default: formData.set_as_default ?? true,
    };

    const { data, error } = await supabase.rpc("add_new_vehicle", payload);

    if (error) {
      console.error("[driverService.addNewVehicle] RPC Error:", error.message);
      if (error.message?.includes("vehicles_plate_key") || error.message?.includes("registrada")) {
        throw new Error("La placa del vehículo ya está registrada en el sistema.");
      }
      throw new Error(error.message || "Error al registrar el nuevo vehículo.");
    }

    return data;
  },

  /**
   * Switches which vehicle is marked as default for the driver.
   */
  async setDefaultVehicle(userId: string, vehicleId: string): Promise<any> {
    const { data, error } = await supabase.rpc("set_default_vehicle", {
      p_user_id: userId,
      p_vehicle_id: vehicleId,
    });

    if (error) {
      console.error("[driverService.setDefaultVehicle] RPC Error:", error.message);
      throw new Error(error.message || "Error al cambiar el vehículo predeterminado.");
    }

    return data;
  },

  /**
   * DIRECT QUERY: Fetches driver profile for a given user.
   */
  async getDriverProfile(userId: string): Promise<DriverProfile | null> {
    const { data, error } = await supabase
      .from("driver_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[driverService.getDriverProfile] Error:", error.message);
      throw error;
    }
    return data;
  },

  /**
   * DIRECT QUERY: Fetches active vehicles for a given driver user.
   */
  async getDriverVehicles(userId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[driverService.getDriverVehicles] Error:", error.message);
      throw error;
    }
    return data || [];
  },

  /**
   * DIRECT QUERY: Checks the driver application status for a user and retrieves all vehicles.
   */
  async getDriverApplicationStatus(userId: string): Promise<DriverApplicationStatus> {
    try {
      const profile = await this.getDriverProfile(userId);
      if (!profile) {
        return { hasApplied: false, profile: null, defaultVehicle: null, vehicles: [] };
      }

      const vehicles = await this.getDriverVehicles(userId);
      const defaultVehicle = vehicles.find((v) => v.is_default) || vehicles[0] || null;

      return {
        hasApplied: true,
        profile,
        defaultVehicle,
        vehicles,
      };
    } catch (error: any) {
      console.error("[driverService.getDriverApplicationStatus] Error:", error.message);
      return { hasApplied: false, profile: null, defaultVehicle: null, vehicles: [] };
    }
  },
};
