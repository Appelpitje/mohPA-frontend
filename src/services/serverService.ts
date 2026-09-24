import apiClient from './api';
import {
  ServerListResponse,
  ServerDetails,
  ServerFilter,
  RegisterServerData,
  RegisterServerResponse,
  ServerHistoryResponse,
  ServerHistoryRange,
} from '../types/server';

export const serverService = {
  /**
   * List live dedicated game servers with optional filters
   */
  async getServers(filter: ServerFilter = {}): Promise<ServerListResponse> {
    const params = new URLSearchParams();
    if (filter.gameSlug) params.append('game_slug', filter.gameSlug);
    if (filter.isOnline !== undefined) params.append('is_online', String(filter.isOnline));
    if (filter.isRanked !== undefined) params.append('is_ranked', String(filter.isRanked));
    if (filter.mapName) params.append('map_name', filter.mapName);
    if (filter.search) params.append('search', filter.search);
    if (filter.limit !== undefined) params.append('limit', String(filter.limit));
    if (filter.offset !== undefined) params.append('offset', String(filter.offset));

    const queryStr = params.toString();
    const endpoint = queryStr ? `/servers?${queryStr}` : '/servers';
    const response = await apiClient.get<ServerListResponse>(endpoint);
    return response.data;
  },

  /**
   * Fetch in-depth server details including live player scoreboard and rules
   */
  async getServerDetails(id: string): Promise<ServerDetails> {
    const response = await apiClient.get<ServerDetails>(`/servers/${id}`);
    return response.data;
  },

  /**
   * Register a new dedicated server node
   */
  async registerServer(data: RegisterServerData): Promise<RegisterServerResponse> {
    const response = await apiClient.post<RegisterServerResponse>('/servers/register', data);
    return response.data;
  },

  /**
   * Probes and updates server status on-demand via UDP query
   */
  async queryServer(id: string): Promise<any> {
    const response = await apiClient.post(`/servers/${id}/query`);
    return response.data;
  },

  /**
   * Fetch historical stats, GameTracker charts (24h, 7d, 30d), and who played
   */
  async getServerHistory(id: string, range: ServerHistoryRange = '24h'): Promise<ServerHistoryResponse> {
    const response = await apiClient.get<ServerHistoryResponse>(`/servers/${id}/history?range=${range}`);
    return response.data;
  },
};

export default serverService;
